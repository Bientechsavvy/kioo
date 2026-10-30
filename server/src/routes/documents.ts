import { Router } from "express";
import multer from "multer";
import type { AppContext } from "../index";
import { chunkPages, countWords } from "../services/chunker";
import { parseDocument, typeFromName, ParseError } from "../services/documentParser";
import { isValidId } from "../services/store";

export function documentsRouter(ctx: AppContext) {
  const r = Router();
  const upload = multer({
    storage: multer.memoryStorage(), // the file is only kept by our own store, under a generated id
    limits: { fileSize: ctx.config.maxUploadMb * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (typeFromName(file.originalname)) return cb(null, true);
      cb(Object.assign(new Error("Only .txt, .md, .pdf, .docx, .html, .csv and .json files are supported."), { code: "UNSUPPORTED_TYPE" }));
    },
  });

  r.get("/", (_req, res) => res.json({ documents: ctx.store.list() }));

  r.post("/", upload.single("file"), async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) throw new ParseError("Choose a file to import.");
      // Browsers send the filename as latin1; convert so accents survive. Only the base name is kept.
      const name = Buffer.from(file.originalname, "latin1").toString("utf8").split(/[\\/]/).pop()!.slice(0, 120);
      const type = typeFromName(name)!;
      const pages = await parseDocument(file.buffer, type, ctx.config.maxPdfPages);
      const chunks = chunkPages(pages);
      if (!chunks.length) throw new ParseError("No readable text was found in this document.");
      const meta = ctx.store.add({ name, type, original: file.buffer, words: countWords(pages), chunks });
      ctx.retriever.setChunks(ctx.store.allChunks());
      res.status(201).json({ document: meta });
    } catch (err) {
      next(err);
    }
  });

  r.delete("/:id", (req, res) => {
    const id = req.params.id;
    if (!isValidId(id) || !ctx.store.remove(id)) return void res.status(404).json({ error: "Document not found." });
    ctx.retriever.setChunks(ctx.store.allChunks());
    res.status(204).end();
  });

  return r;
}
