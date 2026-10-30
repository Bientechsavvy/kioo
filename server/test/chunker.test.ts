import { describe, expect, it } from "vitest";
import { chunkPages } from "../src/services/chunker";

const words = (n: number, prefix = "w") => Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(" ");

describe("chunkPages", () => {
  it("keeps a short text in one passage", () => {
    const c = chunkPages([{ page: null, text: "One short paragraph." }]);
    expect(c).toHaveLength(1);
    expect(c[0].page).toBeNull();
  });

  it("splits long text into several passages that overlap", () => {
    const text = Array.from({ length: 12 }, (_, i) => words(60, `p${i}_`)).join("\n\n");
    const c = chunkPages([{ page: null, text }], { targetWords: 200, overlapWords: 30 });
    expect(c.length).toBeGreaterThan(2);
    // the start of passage 2 repeats words from the end of passage 1
    const lastWordOfFirst = c[0].text.split(/\s+/).pop()!;
    expect(c[1].text).toContain(lastWordOfFirst);
    for (const x of c) expect(x.text.split(/\s+/).length).toBeLessThanOrEqual(260);
  });

  it("never crosses a page, so page numbers are exact", () => {
    const c = chunkPages([
      { page: 1, text: words(50, "a") },
      { page: 2, text: words(50, "b") },
    ]);
    expect(c.map((x) => x.page)).toEqual([1, 2]);
    expect(c[0].text).not.toContain("b0");
  });

  it("cuts one very long paragraph into windows", () => {
    const c = chunkPages([{ page: null, text: words(1000) }], { targetWords: 200, overlapWords: 20 });
    expect(c.length).toBeGreaterThanOrEqual(5);
  });

  it("remembers the Markdown section a passage came from", () => {
    const text = "# Title\n\nIntro text.\n\n## Isolating the supply\n\nSwitch off the breaker.";
    const c = chunkPages([{ page: null, text }]);
    expect(c[0].section).toBe("Title");
    const long = "# T\n\n" + words(150, "x") + "\n\n## Second part\n\n" + words(150, "y");
    const d = chunkPages([{ page: null, text: long }], { targetWords: 160, overlapWords: 20 });
    expect(d.at(-1)!.section).toBe("Second part");
  });

  it("numbers passages in order and ignores empty pages", () => {
    const c = chunkPages([{ page: 1, text: "  \n\n " }, { page: 2, text: "Hello there." }]);
    expect(c).toHaveLength(1);
    expect(c[0].index).toBe(0);
  });
});
