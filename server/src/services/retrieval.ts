import type { Chunk } from "../types";

/** Words that carry no meaning for search, in English and French. */
const STOP = new Set(`a an the of and or to in on at for with without by from is are was were be been being it its this that these those
what which who whom how why when where do does did can could should would will may might must i you he she we they me my your our their
there here as if then than so not no yes about into over under before after between during up down out off again also very just
le la les un une des du de d l et ou est sont été être a ont avait que qui quoi quel quelle quels quelles comment pourquoi quand où
dans pour avec sans sur sous par au aux ce cet cette ces il elle ils elles nous vous je tu on se sa son ses leur leurs mon ma mes ne pas
plus mais donc car si y en faut doit dois peut peuvent faire fait`.split(/\s+/));

/** Lowercase, remove accents, split into words, drop stop words, and apply a very light stemmer. */
export function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
  const out: string[] = [];
  for (const raw of words) {
    if (STOP.has(raw)) continue;
    out.push(stem(raw));
  }
  return out;
}

function stem(w: string): string {
  if (/^\d+$/.test(w)) return w;
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 6 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 6 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 6 && w.endsWith("er")) w = w.slice(0, -2);
  return w;
}

export interface Hit {
  chunk: Chunk;
  score: number;
}

const K1 = 1.5;
const B = 0.75;

/** A small in-memory BM25 index. It is rebuilt from the saved chunks when the server starts. */
export class Retriever {
  private chunks: Chunk[] = [];
  private tokens: string[][] = [];
  private df = new Map<string, number>();
  private avgLen = 0;

  setChunks(chunks: Chunk[]) {
    this.chunks = chunks;
    this.tokens = chunks.map((c) => tokenize(c.text + " " + (c.section ?? "") + " " + c.documentName));
    this.df = new Map();
    let total = 0;
    for (const toks of this.tokens) {
      total += toks.length;
      for (const t of new Set(toks)) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    }
    this.avgLen = this.chunks.length ? total / this.chunks.length : 0;
  }

  get size() {
    return this.chunks.length;
  }

  /**
   * Return the best passages for a question, or an empty list when nothing is relevant.
   * A passage must match enough of the question's words, otherwise Kioo says it found nothing.
   */
  search(question: string, k = 4, minCoverage = 0.4): Hit[] {
    const q = [...new Set(tokenize(question))];
    if (!q.length || !this.chunks.length) return [];
    const n = this.chunks.length;
    const hits: Hit[] = [];

    this.chunks.forEach((chunk, i) => {
      const toks = this.tokens[i];
      const tf = new Map<string, number>();
      for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
      let score = 0;
      let matched = 0;
      for (const term of q) {
        const f = tf.get(term);
        if (!f) continue;
        matched++;
        const df = this.df.get(term) ?? 0;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * toks.length) / (this.avgLen || 1))));
      }
      if (matched && matched / q.length >= minCoverage) hits.push({ chunk, score });
    });

    return hits.sort((a, b) => b.score - a.score).slice(0, k);
  }
}
