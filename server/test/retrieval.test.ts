import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Retriever, tokenize } from "../src/services/retrieval";
import { importSample, tempStore } from "./helpers";

describe("tokenize", () => {
  it("removes accents, stop words and plurals", () => {
    expect(tokenize("Les précautions électriques")).toEqual(["precaution", "electrique"]);
    expect(tokenize("the batteries")).toEqual(["batterie"]);
  });
  it("matches inspect, inspecting and inspected", () => {
    expect(tokenize("inspecting")).toEqual(tokenize("inspected"));
  });
});

describe("Retriever with the sample documents", () => {
  const t = tempStore();
  const retriever = new Retriever();
  beforeAll(async () => {
    for (const f of ["electrical_safety_guide.md", "guide_securite_electrique.txt", "solar_water_pump_maintenance.md", "seed_saving_notes.txt"]) {
      await importSample(t.store, f);
    }
    retriever.setChunks(t.store.allChunks());
  });
  afterAll(() => t.cleanup());

  it("finds the lockout passage for an English question", () => {
    const hits = retriever.search("How do I lock out a circuit before working on it?", 3);
    expect(hits[0].chunk.documentName).toBe("electrical_safety_guide.md");
    expect(hits[0].chunk.text.toLowerCase()).toContain("lock");
  });

  it("finds the French document for a French question", () => {
    const hits = retriever.search("Comment consigner un circuit ?", 3);
    expect(hits[0].chunk.documentName).toBe("guide_securite_electrique.txt");
  });

  it("finds the pump passage about a blocked inlet", () => {
    const hits = retriever.search("Why is the water flow weak?", 3);
    expect(hits[0].chunk.documentName).toBe("solar_water_pump_maintenance.md");
  });

  it("returns nothing for a question the documents do not cover", () => {
    expect(retriever.search("Who won the football world cup in 1998?")).toEqual([]);
    expect(retriever.search("What is the capital of Mars?")).toEqual([]);
  });

  it("returns nothing for an empty question or an empty index", () => {
    expect(retriever.search("   ")).toEqual([]);
    expect(new Retriever().search("electrical")).toEqual([]);
  });

  it("orders results by score", () => {
    const hits = retriever.search("electrical safety isolate circuit voltage detector", 4);
    for (let i = 1; i < hits.length; i++) expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
  });
});
