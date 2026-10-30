import fs from "fs";
import os from "os";
import path from "path";
import { chunkPages, countWords } from "../src/services/chunker";
import { parseDocument, typeFromName } from "../src/services/documentParser";
import { Store } from "../src/services/store";

export const SAMPLES = path.resolve(__dirname, "../../samples");

export function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kioo-test-"));
  return { dir, store: new Store(dir), cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

/** Import a file from samples/ into a store, the same way the upload route does. */
export async function importSample(store: Store, filename: string) {
  const buf = fs.readFileSync(path.join(SAMPLES, filename));
  const type = typeFromName(filename)!;
  const pages = await parseDocument(buf, type);
  return store.add({ name: filename, type, original: buf, words: countWords(pages), chunks: chunkPages(pages) });
}
