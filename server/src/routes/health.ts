import { Router } from "express";
import type { AppContext } from "../index";

export function healthRouter(ctx: AppContext) {
  const r = Router();
  r.get("/", async (_req, res) => {
    const ollama = await ctx.model.check();
    res.json({
      backend: true,
      ollama,
      storage: { available: ctx.store.available(), documents: ctx.store.list().length, passages: ctx.retriever.size },
      version: "0.1.0",
    });
  });
  return r;
}
