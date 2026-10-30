import path from "path";
import dotenv from "dotenv";

// Optional: values can also come from the shell. .env is only a convenience for local use.
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export const config = {
  host: process.env.HOST || "127.0.0.1", // loopback only by default: the API is not public
  port: num(process.env.PORT, 8787),
  ollamaUrl: (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, ""),
  model: process.env.OLLAMA_MODEL || "qwen2.5:1.5b",
  ollamaTimeoutMs: num(process.env.OLLAMA_TIMEOUT_MS, 180_000),
  dataDir: path.resolve(process.env.DATA_DIR || path.resolve(__dirname, "../data")),
  maxUploadMb: num(process.env.MAX_UPLOAD_MB, 15),
  maxPdfPages: num(process.env.MAX_PDF_PAGES, 400),
  topK: num(process.env.TOP_K, 4),
  allowRemote: process.env.ALLOW_REMOTE === "1",
};

export type Config = typeof config;
