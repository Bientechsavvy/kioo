import type { ParsedPage } from "./documentParser";

export interface RawChunk {
  index: number;
  page: number | null;
  section: string | null;
  text: string;
}

export interface ChunkOptions {
  /** Target size in words. */
  targetWords: number;
  /** Words repeated from the end of the previous chunk, so ideas are not cut in half. */
  overlapWords: number;
}

// The design document suggests 400 to 700 words as a starting point. After testing with short manuals,
// smaller passages (about 220 words) gave more precise sources and fit the small model's context better.
export const DEFAULT_CHUNKING: ChunkOptions = { targetWords: 220, overlapWords: 40 };

const HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;
const wordsOf = (s: string) => s.split(/\s+/).filter(Boolean);

/**
 * Split pages into passages. A passage never crosses a page, so a page reference is exact.
 * Markdown headings are tracked so a passage can say which section it came from.
 */
export function chunkPages(pages: ParsedPage[], opts: ChunkOptions = DEFAULT_CHUNKING): RawChunk[] {
  const out: RawChunk[] = [];
  let section: string | null = null;

  for (const page of pages) {
    let buffer: string[] = []; // paragraphs of the passage being built
    let bufferWords = 0;
    let startSection = section;

    const flush = () => {
      const text = buffer.join("\n\n").trim();
      if (text) out.push({ index: out.length, page: page.page, section: startSection, text });
      const tail = wordsOf(text).slice(-opts.overlapWords).join(" ");
      buffer = tail && bufferWords > opts.overlapWords ? [tail] : [];
      bufferWords = buffer.length ? wordsOf(tail).length : 0;
      startSection = section;
    };

    for (const para of page.text.split(/\n\s*\n/)) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      const heading = trimmed.split("\n").map((l) => HEADING.exec(l)).filter(Boolean).pop();
      if (heading) section = heading[1];
      const w = wordsOf(trimmed);

      if (w.length > opts.targetWords) {
        // One very long paragraph: cut it into windows of the target size.
        if (bufferWords > opts.overlapWords) flush();
        for (let i = 0; i < w.length; i += opts.targetWords - opts.overlapWords) {
          buffer = [w.slice(i, i + opts.targetWords).join(" ")];
          bufferWords = Math.min(opts.targetWords, w.length - i);
          flush();
          if (i + opts.targetWords >= w.length) break;
        }
        buffer = [];
        bufferWords = 0;
        continue;
      }
      if (bufferWords + w.length > opts.targetWords && bufferWords > opts.overlapWords) flush();
      if (!buffer.length) startSection = section;
      buffer.push(trimmed);
      bufferWords += w.length;
    }
    if (bufferWords > 0 && buffer.join("").trim()) {
      const text = buffer.join("\n\n").trim();
      const last = out[out.length - 1];
      // Do not emit a passage that only repeats the overlap of the previous one.
      if (!(last && last.page === page.page && last.text.endsWith(text))) {
        out.push({ index: out.length, page: page.page, section: startSection, text });
      }
    }
  }
  return out.map((c, i) => ({ ...c, index: i }));
}

export const countWords = (pages: ParsedPage[]) => pages.reduce((n, p) => n + wordsOf(p.text).length, 0);
