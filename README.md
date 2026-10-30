# Kioo

**When the internet disappears, knowledge stays.**

Kioo is an offline-first AI knowledge assistant. You import documents (text, Markdown, PDF), ask questions in English or French, and a **local open-weight model** (through [Ollama](https://ollama.com)) answers using only passages from your documents. Every answer shows the real source passages next to it, and Kioo says so when the documents do not contain the answer.

- Runs on your computer. The core workflow calls no remote AI service.
- Works with the internet off, after the one-time install and model download.
- Open source (MIT). The model name is a setting, so you can swap it.

> A small model can still be wrong. Kioo shows its sources on every answer so you can check them. It never presents generated text as verified fact.

## Features

| Feature | Status |
|---|---|
| Local inference with Ollama (default `qwen2.5:1.5b`) | Done |
| Import `.pdf` (page numbers kept), `.docx`, `.txt`, `.md`, `.html`, `.csv`, `.json` | Done |
| Local BM25 search over passages | Done |
| Source-grounded answers with real citations | Done |
| "Not found" instead of guessing | Done |
| English and French questions and interface | Done (tested with the sample documents) |
| Delete a document and its index entries | Done |
| Honest status: server, model, library, internet | Done |
| Documents survive a restart | Done |
| Read aloud, cloud mode, fine-tuning | Not in this version |

## Quick start (Windows, PowerShell)

You need [Node.js LTS](https://nodejs.org), Git and [Ollama for Windows](https://ollama.com/download/windows).

```powershell
git clone https://github.com/YOUR-GITHUB-NAME/kioo.git
cd kioo
ollama pull qwen2.5:1.5b
npm run install:all
npm run build
npm start
```

Open **http://127.0.0.1:8787**. The status line at the top shows whether the server and the model are really ready.

Then click **Add a document** and import the files in `samples/`, and try:

- *What precautions should be taken before inspecting an electrical system?*
- *Comment consigner un circuit ?*
- *Who won the football world cup in 1998?* (Kioo should say it cannot find it.)

### Development mode (two terminals)

```powershell
npm run dev:server     # API on port 8787, restarts on changes
npm run dev:client     # interface on http://localhost:5173
```

### Settings

All optional (see `.env.example`). You can also set them in the shell, for example `$env:OLLAMA_MODEL="qwen2.5:3b"`.

| Setting | Default | Meaning |
|---|---|---|
| `OLLAMA_MODEL` | `qwen2.5:1.5b` | Any model you have pulled |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Where Ollama listens |
| `PORT` / `HOST` | `8787` / `127.0.0.1` | Kioo listens on this computer only by default |
| `MAX_UPLOAD_MB` | `15` | Largest file accepted |
| `TOP_K` | `4` | Passages sent to the model |

## Commands

| Command | What it does |
|---|---|
| `npm run install:all` | Installs server and client dependencies |
| `npm run build` | Builds the interface (the server then serves it) |
| `npm start` | Starts Kioo |
| `npm test` | Server (46) and client (6) tests, no model or internet needed |
| `npm run eval` | Retrieval evaluation on the sample documents |
| `npm run eval -- --with-model` | Also asks your local model and records times |
| `npm run smoke` | End-to-end check against the running server (use it for the offline test) |
| `npm run check:external` | Lists any web address in the source other than this computer |

## The offline test

Step by step in [docs/DEMO.md](docs/DEMO.md): import documents with the internet on, ask, turn Wi-Fi off, ask again, check the sources.

## How it works

```text
React interface -> local Express API -> parser -> chunker -> BM25 index
                                    \-> top passages -> prompt -> Ollama (local model)
                                    \-> answer + sources taken from the index
```

Details and trade-offs: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Privacy and security: [docs/PRIVACY.md](docs/PRIVACY.md). Licenses: [docs/LICENSES.md](docs/LICENSES.md).

## Evaluation

`eval/questions.json` holds 12 questions (10 answerable, 2 not) over four small sample documents written for this project. The retrieval-only result is in `eval/results-retrieval.md`: the right passage was found for 10 of 10 answerable questions, and 1 of 2 unanswerable questions was stopped by retrieval alone (the other relies on the model to answer NOT_FOUND). This is an easy test: small documents, one author. Run `npm run eval -- --with-model` on your computer for the model results and record your own timings.

## Limitations

- Keyword search (BM25) cannot match different words with the same meaning, and cannot answer a French question from an English-only document.
- Small models can be slow on old laptops and can misread a correct passage.
- Scanned PDFs (images) are not read. Old Word `.doc` files and images are not supported: save as `.docx` or PDF first.
- No login or encryption: anyone with access to your computer account can read `server/data/`.
- Tested with the sample documents and a fake model in automated tests. Test with your own documents and real Ollama before relying on it.

## Public website (Render)

The `website/` folder is a static landing page. On Render: **New > Static Site**, connect the repo, **Publish directory** `website`, build command empty. The website never runs the AI. Before publishing, replace the placeholders:

```powershell
Select-String -Path website\index.html -Pattern "YOUR-GITHUB-NAME|VIDEO-LINK|ARTICLE-LINK"
```

For a custom domain, follow Render's current custom-domain instructions after the site is live.

## Roadmap

Local embeddings and semantic search, more languages, optional read-aloud, desktop packaging, and community knowledge preservation with informed consent. Fine-tuning only when a measurable benefit exists.

## License

MIT. See [LICENSE](LICENSE). The model has its own license: see [docs/LICENSES.md](docs/LICENSES.md).
