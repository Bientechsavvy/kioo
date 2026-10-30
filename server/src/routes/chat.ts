import { Router } from "express";
import type { AppContext } from "../index";
import { detectLanguage, MESSAGES } from "../services/language";
import { ModelUnavailableError } from "../services/ollama";
import { buildPrompt, NOT_FOUND_MARKER } from "../services/prompt";
import { tokenize, type Hit } from "../services/retrieval";
import type { Lang, SourceRef } from "../types";

const EXCERPT_CHARS = 420;

/** The sentences of the passage that best match the question, so the excerpt shows the supporting text. */
export function bestExcerpt(text: string, question: string, limit = EXCERPT_CHARS): string {
  if (text.length <= limit) return text;
  const sentences = text.split(/(?<=[.!?:])\s+|\n+/).filter((s) => s.trim());
  const q = new Set(tokenize(question));
  let best = 0;
  let bestScore = -1;
  sentences.forEach((s, i) => {
    const score = tokenize(s).filter((t) => q.has(t)).length;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  let out = sentences[best];
  for (const i of [best + 1, best - 1]) {
    const next = i > best ? out + " " + (sentences[i] ?? "") : (sentences[i] ?? "") + " " + out;
    if (sentences[i] && next.length <= limit) out = next;
  }
  const clipped = out.length > limit ? out.slice(0, limit).trimEnd() + "…" : out;
  return (best > 0 ? "… " : "") + clipped + (best < sentences.length - 1 && out.length <= limit ? " …" : "");
}

function toSources(hits: Hit[], citedNumbers: Set<number>, question = ""): SourceRef[] {
  return hits.map((h, i) => ({
    n: i + 1,
    documentId: h.chunk.documentId,
    documentName: h.chunk.documentName,
    page: h.chunk.page,
    section: h.chunk.section,
    excerpt: bestExcerpt(h.chunk.text, question),
    score: Math.round(h.score * 100) / 100,
    cited: citedNumbers.has(i + 1),
  }));
}

/** Citation numbers [n] the model used. Numbers that do not exist are ignored, so a source can never be invented. */
function citedNumbers(answer: string, max: number): Set<number> {
  const found = new Set<number>();
  for (const m of answer.matchAll(/\[(\d{1,2})\]/g)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= max) found.add(n);
  }
  return found;
}

export function chatRouter(ctx: AppContext) {
  const r = Router();

  r.post("/", async (req, res, next) => {
    try {
      const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
      if (question.length < 2) return void res.status(400).json({ error: "Type a question first." });
      if (question.length > 1000) return void res.status(400).json({ error: "The question is too long (limit 1000 characters)." });
      const requested = req.body?.language;
      const lang: Lang = requested === "en" || requested === "fr" ? requested : detectLanguage(question);
      const msg = MESSAGES[lang];

      if (!ctx.retriever.size) {
        return void res.json({ answer: msg.noDocuments, sources: [], grounded: false, reason: "no_documents", language: lang });
      }

      const t0 = Date.now();
      const hits = ctx.retriever.search(question, ctx.config.topK);
      const retrievalMs = Date.now() - t0;
      if (!hits.length) {
        return void res.json({ answer: msg.notFound, sources: [], grounded: false, reason: "no_evidence", language: lang, timings: { retrievalMs } });
      }

      const { system, user } = buildPrompt(question, hits, lang);
      let raw: string;
      const t1 = Date.now();
      try {
        raw = await ctx.model.generate(system, user);
      } catch (err) {
        if (err instanceof ModelUnavailableError) {
          // Retrieval still worked, so show the passages that were found.
          return void res.status(503).json({
            error: err.message,
            code: "MODEL_UNAVAILABLE",
            answer: msg.modelDown,
            sources: toSources(hits, new Set(), question),
            grounded: false,
            language: lang,
          });
        }
        throw err;
      }

      if (raw.trim().toUpperCase().startsWith(NOT_FOUND_MARKER)) {
        return void res.json({ answer: msg.notFound, sources: [], grounded: false, reason: "model_not_found", language: lang });
      }
      const answer = raw.trim();
      res.json({
        answer,
        sources: toSources(hits, citedNumbers(answer, hits.length), question),
        grounded: true,
        language: lang,
        model: ctx.config.model,
        timings: { retrievalMs, modelMs: Date.now() - t1 },
      });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
