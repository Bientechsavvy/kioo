// Smoke test against a RUNNING Kioo server. Use it for the offline test (see docs/DEMO.md):
//   npm run smoke            (server on http://127.0.0.1:8787)
//   npm run smoke -- http://127.0.0.1:8787 "your own question"
import { readFileSync } from "node:fs";

const base = process.argv[2] || "http://127.0.0.1:8787";
const question = process.argv[3] || "How do I lock out a circuit before working on it?";
const file = new URL("../samples/electrical_safety_guide.md", import.meta.url);

const json = async (res) => ({ status: res.status, body: res.status === 204 ? {} : await res.json() });
const step = (ok, text) => console.log(`${ok ? "PASS" : "FAIL"}  ${text}`);
let failed = false;
const check = (ok, text) => { step(ok, text); if (!ok) failed = true; };

try {
  const h = (await json(await fetch(`${base}/api/health`))).body;
  check(h.backend === true, "Kioo server is running");
  check(h.ollama.reachable, "Ollama is reachable");
  check(h.ollama.modelInstalled, `Model ${h.ollama.model} is installed`);

  const form = new FormData();
  form.append("file", new Blob([readFileSync(file)]), "smoke-test-guide.md");
  const up = await json(await fetch(`${base}/api/documents`, { method: "POST", body: form }));
  check(up.status === 201, "Imported a sample document");

  const t0 = Date.now();
  const chat = await json(await fetch(`${base}/api/chat`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }),
  }));
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  check(chat.status === 200 && chat.body.grounded, `Got a grounded answer in ${secs} s`);
  console.log("\nQuestion:", question, "\nAnswer:  ", chat.body.answer);
  for (const s of chat.body.sources || []) console.log(`  [${s.n}] ${s.documentName}${s.page ? ", page " + s.page : ""}${s.cited ? "  (cited)" : ""}`);

  if (up.body.document) {
    const del = await fetch(`${base}/api/documents/${up.body.document.id}`, { method: "DELETE" });
    check(del.status === 204, "Removed the smoke-test document again");
  }
} catch (e) {
  check(false, `Could not reach Kioo at ${base}: ${e.message}`);
}
process.exit(failed ? 1 : 0);
