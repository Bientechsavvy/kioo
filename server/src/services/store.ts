import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Chunk, DocumentMeta } from "../types";
import type { RawChunk } from "./chunker";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isValidId = (id: string) => ID.test(id);

/**
 * Keeps documents on this computer only. Layout inside the data folder:
 *   documents.json        list of document metadata
 *   chunks/<id>.json      the passages of one document
 *   files/<id>.<ext>      the original upload (named by a generated id, never by the user's filename)
 */
export class Store {
  private docs: DocumentMeta[] = [];

  constructor(private dir: string) {
    fs.mkdirSync(path.join(dir, "chunks"), { recursive: true });
    fs.mkdirSync(path.join(dir, "files"), { recursive: true });
    this.docs = this.readJson<DocumentMeta[]>(path.join(dir, "documents.json"), []);
  }

  private readJson<T>(file: string, fallback: T): T {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8")) as T;
    } catch {
      return fallback;
    }
  }

  /** Write to a temporary file first, so a crash cannot leave a half-written file. */
  private writeJson(file: string, data: unknown) {
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  }

  /** A path inside the data folder. Refuses anything that would escape it. */
  private inside(...parts: string[]): string {
    const p = path.resolve(this.dir, ...parts);
    if (!p.startsWith(path.resolve(this.dir) + path.sep)) throw new Error("Unsafe path");
    return p;
  }

  list(): DocumentMeta[] {
    return [...this.docs].sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  }

  get(id: string): DocumentMeta | undefined {
    return this.docs.find((d) => d.id === id);
  }

  add(info: { name: string; type: DocumentMeta["type"]; original: Buffer; words: number; chunks: RawChunk[] }): DocumentMeta {
    const id = randomUUID();
    const meta: DocumentMeta = {
      id,
      name: info.name,
      type: info.type,
      sizeBytes: info.original.length,
      words: info.words,
      chunks: info.chunks.length,
      importedAt: new Date().toISOString(),
      status: "ready",
    };
    const chunks: Chunk[] = info.chunks.map((c) => ({
      id: `${id}:${c.index}`,
      documentId: id,
      documentName: info.name,
      index: c.index,
      page: c.page,
      section: c.section,
      text: c.text,
    }));
    fs.writeFileSync(this.inside("files", `${id}.${info.type}`), info.original);
    this.writeJson(this.inside("chunks", `${id}.json`), chunks);
    this.docs.push(meta);
    this.writeJson(path.join(this.dir, "documents.json"), this.docs);
    return meta;
  }

  /** Remove the document, its original file and its passages. */
  remove(id: string): boolean {
    const meta = this.get(id);
    if (!meta || !isValidId(id)) return false;
    for (const f of [this.inside("files", `${id}.${meta.type}`), this.inside("chunks", `${id}.json`)]) {
      try {
        fs.unlinkSync(f);
      } catch {
        /* already gone */
      }
    }
    this.docs = this.docs.filter((d) => d.id !== id);
    this.writeJson(path.join(this.dir, "documents.json"), this.docs);
    return true;
  }

  allChunks(): Chunk[] {
    return this.docs.flatMap((d) => this.readJson<Chunk[]>(this.inside("chunks", `${d.id}.json`), []));
  }

  /** True when the data folder can be written to. */
  available(): boolean {
    try {
      fs.accessSync(this.dir, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
}
