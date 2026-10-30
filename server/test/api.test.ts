import fs from "fs";
import http from "http";
import path from "path";
import type { AddressInfo } from "net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../src/config";
import { createApp } from "../src/index";
import { ModelUnavailableError, type ModelClient } from "../src/services/ollama";
import { SAMPLES, tempStore } from "./helpers";

/** A stand-in for Ollama so the tests need no model and no internet. */
const fake: ModelClient & { reply: string | Error; lastUser: string } = {
  reply: "Switch off the breaker and lock it [1].",
  lastUser: "",
  async check() {
    return { reachable: true, model: "fake", modelInstalled: true };
  },
  async generate(_system, user) {
    this.lastUser = user;
    if (this.reply instanceof Error) throw this.reply;
    return this.reply;
  },
};

let base = "";
let server: http.Server;
const t = tempStore();

beforeAll(async () => {
  const { app } = createApp({ store: t.store, model: fake, config: { ...config, maxUploadMb: 1 } });
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  server.close();
  t.cleanup();
});
beforeEach(() => {
  fake.reply = "Switch off the breaker and lock it [1].";
});

async function upload(name: string, data: Buffer | string) {
  const form = new FormData();
  form.append("file", new Blob([typeof data === "string" ? data : new Uint8Array(data)]), name);
  return fetch(`${base}/api/documents`, { method: "POST", body: form });
}
const sample = (f: string) => fs.readFileSync(path.join(SAMPLES, f));
const ask = (question: string, language?: string) =>
  fetch(`${base}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, language }) });

describe("health", () => {
  it("reports the model and storage honestly", async () => {
    const j = await (await fetch(`${base}/api/health`)).json();
    expect(j.backend).toBe(true);
    expect(j.ollama).toEqual({ reachable: true, model: "fake", modelInstalled: true });
    expect(j.storage.available).toBe(true);
  });
});

describe("chat with an empty library", () => {
  it("says there are no documents and does not call the model", async () => {
    fake.lastUser = "";
    const j = await (await ask("How do I isolate a circuit?")).json();
    expect(j.reason).toBe("no_documents");
    expect(j.grounded).toBe(false);
    expect(fake.lastUser).toBe("");
  });
});

describe("documents and chat", () => {
  let id = "";

  it("imports a Markdown file", async () => {
    const res = await upload("electrical_safety_guide.md", sample("electrical_safety_guide.md"));
    expect(res.status).toBe(201);
    const j = await res.json();
    id = j.document.id;
    expect(j.document.chunks).toBeGreaterThan(1);
  });

  it("imports a PDF and keeps page numbers", async () => {
    const res = await upload("guide.pdf", sample("electrical_safety_guide.pdf"));
    expect(res.status).toBe(201);
    const q = await (await ask("What is lockout and tagout?")).json();
    expect(q.sources.some((s: any) => s.page !== null)).toBe(true);
  });

  it("lists documents without their full text", async () => {
    const j = await (await fetch(`${base}/api/documents`)).json();
    expect(j.documents.length).toBe(2);
    expect(JSON.stringify(j)).not.toContain("Switch off the breaker that supplies it");
  });

  it("answers from the documents and returns real sources", async () => {
    const j = await (await ask("How do I lock out a circuit?")).json();
    expect(j.grounded).toBe(true);
    expect(j.answer).toContain("breaker");
    expect(j.sources.length).toBeGreaterThan(0);
    expect(j.sources[0].documentName).toMatch(/electrical_safety_guide|guide\.pdf/);
    expect(j.sources.find((s: any) => s.n === 1).cited).toBe(true);
    expect(fake.lastUser).toContain("How do I lock out a circuit?");
  });

  it("ignores citation numbers that do not exist", async () => {
    fake.reply = "Lock it [1] and also see [9].";
    const j = await (await ask("How do I lock out a circuit?")).json();
    expect(j.sources.every((s: any) => s.n >= 1 && s.n <= 4)).toBe(true);
    expect(j.sources.filter((s: any) => s.cited)).toHaveLength(1);
  });

  it("says so when no passage is relevant, without calling the model", async () => {
    fake.lastUser = "";
    const j = await (await ask("Who won the football world cup in 1998?")).json();
    expect(j.reason).toBe("no_evidence");
    expect(j.sources).toEqual([]);
    expect(fake.lastUser).toBe("");
  });

  it("honours the model's NOT_FOUND answer", async () => {
    fake.reply = "NOT_FOUND";
    const j = await (await ask("How do I lock out a circuit?")).json();
    expect(j.grounded).toBe(false);
    expect(j.sources).toEqual([]);
  });

  it("returns the passages with a 503 when the model is down", async () => {
    fake.reply = new ModelUnavailableError("Ollama is not reachable.");
    const res = await ask("How do I lock out a circuit?");
    expect(res.status).toBe(503);
    const j = await res.json();
    expect(j.code).toBe("MODEL_UNAVAILABLE");
    expect(j.sources.length).toBeGreaterThan(0);
  });

  it("answers in the language of the question", async () => {
    const j = await (await ask("Quelle est la procédure de consignation ?", undefined)).json();
    expect(j.language).toBe("fr");
    const forced = await (await ask("lockout", "fr")).json();
    expect(forced.language).toBe("fr");
  });

  it("rejects empty and oversized questions", async () => {
    expect((await ask("")).status).toBe(400);
    expect((await ask("x".repeat(1001))).status).toBe(400);
  });

  it("deletes a document and its passages", async () => {
    expect((await fetch(`${base}/api/documents/${id}`, { method: "DELETE" })).status).toBe(204);
    expect((await fetch(`${base}/api/documents/${id}`, { method: "DELETE" })).status).toBe(404);
    expect((await fetch(`${base}/api/documents/not-an-id`, { method: "DELETE" })).status).toBe(404);
    const j = await (await fetch(`${base}/api/documents`)).json();
    expect(j.documents.length).toBe(1);
  });
});

describe("upload safety", () => {
  it("rejects unsupported file types", async () => {
    const res = await upload("virus.exe", "MZ");
    expect(res.status).toBe(415);
  });
  it("rejects empty files and fake PDFs", async () => {
    expect((await upload("empty.txt", "")).status).toBe(422);
    expect((await upload("fake.pdf", "not really a pdf")).status).toBe(422);
  });
  it("rejects files over the size limit", async () => {
    const res = await upload("big.txt", "a ".repeat(700_000));
    expect(res.status).toBe(413);
  });
  it("keeps only the base name of a path-like filename", async () => {
    const res = await upload("../../evil/notes.txt", "Some harmless notes about water pumps and solar panels.");
    expect(res.status).toBe(201);
    expect((await res.json()).document.name).toBe("notes.txt");
  });
});

describe("local-only guard", () => {
  it("refuses requests with a foreign Host header", async () => {
    const port = new URL(base).port;
    const status = await new Promise<number>((resolve, reject) => {
      const req = http.request({ host: "127.0.0.1", port, path: "/api/health", headers: { Host: "evil.example.com" } }, (r) => resolve(r.statusCode!));
      req.on("error", reject);
      req.end();
    });
    expect(status).toBe(403);
  });
});
