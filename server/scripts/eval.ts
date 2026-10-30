/**
 * Evaluation of Kioo on the sample documents (eval/questions.json).
 *
 *   npm run eval                 retrieval only: no model needed, fully repeatable
 *   npm run eval -- --with-model also asks your local Ollama model and records the time
 *
 * It writes a Markdown table to eval/results-retrieval.md or eval/results-model.md.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { chunkPages, countWords } from "../src/services/chunker";
import { parseDocument, typeFromName } from "../src/services/documentParser";
import { createOllamaClient } from "../src/services/ollama";
import { buildPrompt, NOT_FOUND_MARKER } from "../src/services/prompt";
import { Retriever } from "../src/services/retrieval";
import { Store } from "../src/services/store";
import { config } from "../src/config";

interface Q {
  id: number;
  lang: "en" | "fr";
  question: string;
  answerable: boolean;
  expectedDoc?: string;
  expectedPhrase?: string;
  answerKeywords?: string[];
}

const root = path.resolve(__dirname, "../..");
const withModel = process.argv.includes("--with-model");

async function main() {
  const questions: Q[] = JSON.parse(fs.readFileSync(path.join(root, "eval/questions.json"), "utf8"));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kioo-eval-"));
  const store = new Store(dir);
  for (const f of ["electrical_safety_guide.md", "guide_securite_electrique.txt", "solar_water_pump_maintenance.md", "seed_saving_notes.txt"]) {
    const buf = fs.readFileSync(path.join(root, "samples", f));
    const pages = await parseDocument(buf, typeFromName(f)!);
    store.add({ name: f, type: typeFromName(f)!, original: buf, words: countWords(pages), chunks: chunkPages(pages) });
  }
  const retriever = new Retriever();
  retriever.setChunks(store.allChunks());
  const model = createOllamaClient();
  if (withModel) {
    const s = await model.check();
    if (!s.reachable || !s.modelInstalled) {
      console.error(`Ollama or the model ${s.model} is not available. Start Ollama and run: ollama pull ${s.model}`);
      process.exit(1);
    }
  }

  const rows: string[] = [];
  let retrievalOk = 0, answerable = 0, rejectedOk = 0, unanswerable = 0, modelOk = 0, totalMs = 0, modelRuns = 0;

  for (const q of questions) {
    const t0 = Date.now();
    const hits = retriever.search(q.question, config.topK);
    const retrievalMs = Date.now() - t0;
    let retrieval: string, answerCell = "";

    if (q.answerable) {
      answerable++;
      const found = hits.some((h) => h.chunk.documentName === q.expectedDoc && h.chunk.text.toLowerCase().includes(q.expectedPhrase!.toLowerCase()));
      const rank = hits.findIndex((h) => h.chunk.documentName === q.expectedDoc && h.chunk.text.toLowerCase().includes(q.expectedPhrase!.toLowerCase())) + 1;
      if (found) retrievalOk++;
      retrieval = found ? `found (rank ${rank})` : "MISSED";
    } else {
      unanswerable++;
      if (!hits.length) rejectedOk++;
      retrieval = hits.length ? "passages retrieved (model must refuse)" : "no passages (correct)";
    }

    if (withModel && hits.length) {
      const { system, user } = buildPrompt(q.question, hits, q.lang);
      const t1 = Date.now();
      const answer = await model.generate(system, user);
      const ms = Date.now() - t1;
      totalMs += ms; modelRuns++;
      const refused = answer.trim().toUpperCase().startsWith(NOT_FOUND_MARKER);
      const ok = q.answerable ? !refused && (q.answerKeywords ?? []).some((k) => answer.toLowerCase().includes(k)) : refused;
      if (ok) modelOk++;
      answerCell = `${ok ? "supported" : "CHECK"} (${(ms / 1000).toFixed(1)}s)`;
    } else if (withModel) {
      const ok = !q.answerable;
      if (ok) modelOk++;
      answerCell = ok ? "refused by retrieval" : "CHECK";
    }
    rows.push(`| ${q.id} | ${q.lang} | ${q.question} | ${q.answerable ? "yes" : "no"} | ${retrieval} | ${retrievalMs} ms |${withModel ? ` ${answerCell} |` : ""}`);
  }

  const head = `| # | Lang | Question | In documents | Retrieval | Search time |${withModel ? " Model answer |" : ""}\n|---|---|---|---|---|---|${withModel ? "---|" : ""}`;
  const summary = [
    `- Answerable questions whose source passage was retrieved: **${retrievalOk}/${answerable}**`,
    `- Unanswerable questions rejected by retrieval alone: **${rejectedOk}/${unanswerable}** (the others rely on the model to answer ${NOT_FOUND_MARKER})`,
  ];
  if (withModel) {
    summary.push(`- Model answers judged supported by the keywords, or correctly refused: **${modelOk}/${questions.length}**`);
    summary.push(`- Average model time: **${modelRuns ? (totalMs / modelRuns / 1000).toFixed(1) : "-"} s** per answer (model ${config.model}, ${os.cpus()[0]?.model ?? "unknown CPU"})`);
    summary.push("- A \"CHECK\" row means a human should read the answer: the keyword check is a rough filter, not a proof.");
  }
  const md = `# Kioo evaluation (${withModel ? "retrieval and local model" : "retrieval only"})\n\nSample documents in samples/, questions in eval/questions.json.\n\n${summary.join("\n")}\n\n${head}\n${rows.join("\n")}\n`;
  fs.writeFileSync(path.join(root, "eval", withModel ? "results-model.md" : "results-retrieval.md"), md);
  console.log(md);
  fs.rmSync(dir, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
