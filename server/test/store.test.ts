import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { Store, isValidId } from "../src/services/store";
import { importSample, tempStore } from "./helpers";

describe("Store", () => {
  it("saves a document, lists it, and survives a restart", async () => {
    const t = tempStore();
    const meta = await importSample(t.store, "seed_saving_notes.txt");
    expect(t.store.list()).toHaveLength(1);
    const again = new Store(t.dir); // a new Store reads the same folder, like a restart
    expect(again.list()[0].id).toBe(meta.id);
    expect(again.allChunks().length).toBe(meta.chunks);
    t.cleanup();
  });

  it("names stored files by generated id, not by the user's filename", async () => {
    const t = tempStore();
    const meta = await importSample(t.store, "seed_saving_notes.txt");
    expect(fs.readdirSync(path.join(t.dir, "files"))).toEqual([`${meta.id}.txt`]);
    t.cleanup();
  });

  it("deletes the document, its passages and its original file", async () => {
    const t = tempStore();
    const meta = await importSample(t.store, "seed_saving_notes.txt");
    expect(t.store.remove(meta.id)).toBe(true);
    expect(t.store.list()).toHaveLength(0);
    expect(t.store.allChunks()).toHaveLength(0);
    expect(fs.readdirSync(path.join(t.dir, "files"))).toHaveLength(0);
    expect(fs.readdirSync(path.join(t.dir, "chunks"))).toHaveLength(0);
    expect(t.store.remove(meta.id)).toBe(false);
    t.cleanup();
  });

  it("refuses ids that are not generated ids (no path tricks)", () => {
    expect(isValidId("../../etc/passwd")).toBe(false);
    expect(isValidId("123")).toBe(false);
    expect(isValidId("0b8f6a54-39a0-4d52-a1c4-5b9f5f0e8a11")).toBe(true);
    const t = tempStore();
    expect(t.store.remove("../documents")).toBe(false);
    t.cleanup();
  });
});
