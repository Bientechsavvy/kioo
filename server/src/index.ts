import fs from "fs";
import path from "path";
import cors from "cors";
import express from "express";
import { config, type Config } from "./config";
import { errorHandler, hostGuard } from "./middleware/errors";
import { chatRouter } from "./routes/chat";
import { documentsRouter } from "./routes/documents";
import { healthRouter } from "./routes/health";
import { createOllamaClient, type ModelClient } from "./services/ollama";
import { Retriever } from "./services/retrieval";
import { Store } from "./services/store";

/** Everything the routes need. Tests pass their own store and a fake model. */
export interface AppContext {
  config: Config;
  store: Store;
  retriever: Retriever;
  model: ModelClient;
}

export function createApp(overrides: Partial<AppContext> = {}) {
  const cfg = overrides.config ?? config;
  const store = overrides.store ?? new Store(cfg.dataDir);
  const retriever = overrides.retriever ?? new Retriever();
  retriever.setChunks(store.allChunks());
  const ctx: AppContext = { config: cfg, store, retriever, model: overrides.model ?? createOllamaClient() };

  const app = express();
  app.disable("x-powered-by");
  app.use(hostGuard(cfg.allowRemote));
  app.use(cors({ origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/] }));
  app.use(express.json({ limit: "20kb" }));

  app.use("/api/health", healthRouter(ctx));
  app.use("/api/documents", documentsRouter(ctx));
  app.use("/api/chat", chatRouter(ctx));
  app.use("/api", (_req, res) => void res.status(404).json({ error: "Not found." }));

  // After `npm run build`, one server serves both the API and the interface.
  const dist = path.resolve(__dirname, "../../client/dist");
  if (fs.existsSync(path.join(dist, "index.html"))) {
    app.use(express.static(dist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }
  app.use(errorHandler);
  return { app, ctx };
}

if (require.main === module) {
  const { app } = createApp();
  app.listen(config.port, config.host, () => {
    console.log(`Kioo is running at http://${config.host === "0.0.0.0" ? "localhost" : config.host}:${config.port}`);
    console.log(`Model: ${config.model} via Ollama at ${config.ollamaUrl}`);
    console.log(`Documents are stored in: ${config.dataDir}`);
  });
}
