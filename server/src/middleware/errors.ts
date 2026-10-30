import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { ParseError } from "../services/documentParser";

/** Reject requests whose Host header is not this computer. This blocks DNS-rebinding attacks on the local API. */
export const hostGuard = (allowRemote: boolean): RequestHandler => (req, res, next) => {
  if (allowRemote) return next();
  const host = (req.headers.host || "").replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  if (["localhost", "127.0.0.1", "::1"].includes(host)) return next();
  res.status(403).json({ error: "Kioo only answers requests from this computer." });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ParseError) return void res.status(422).json({ error: err.message });
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === "LIMIT_FILE_SIZE";
    return void res.status(tooBig ? 413 : 400).json({ error: tooBig ? "That file is too large." : "The upload was not valid." });
  }
  if (err?.code === "UNSUPPORTED_TYPE") return void res.status(415).json({ error: err.message });
  console.error("Unexpected error:", err?.message ?? err);
  res.status(500).json({ error: "Something went wrong on this computer. Check the server window." });
};
