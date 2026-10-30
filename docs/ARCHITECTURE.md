# Architecture

Everything in the core workflow runs on the user's computer.

```text
USER
  |
  v
React + TypeScript interface  (client/)
  |  fetch /api/*  (only to this computer)
  v
Local Express API  (server/)
  |-- documents route  -> parser -> chunker -> store (files on disk) -> BM25 index (memory)
  |-- chat route       -> BM25 search -> relevance gate -> prompt -> Ollama -> answer + sources
  '-- health route     -> asks Ollama which model is installed
  |
  v
Ollama on this computer (http://127.0.0.1:11434) running an open-weight model (default: qwen2.5:1.5b)
```

The public website in `website/` is separate. It only describes the project. It never receives documents or questions.

## Data flow (import)

1. The interface sends the file to `POST /api/documents`.
2. The server checks the extension (.txt, .md, .pdf), the size limit, and for PDFs the `%PDF-` header.
3. `documentParser` extracts text. PDFs are read page by page so a source can say "page 4". Empty, binary, encrypted, scanned (no text) and damaged files are rejected with a readable message.
4. `chunker` cuts the text into passages of about 220 words with 40 words of overlap. A passage never crosses a PDF page. Markdown headings are remembered as the passage's section.
5. `store` saves the original under a generated id and the passages as JSON in `server/data/`. The user's filename is only a display label and is never used as a path.
6. The BM25 index is rebuilt in memory.

## Data flow (question)

1. `POST /api/chat` validates the question (2 to 1000 characters) and detects English or French.
2. `retrieval` scores every passage with BM25 (accents removed, stop words dropped in both languages, a very light stemmer).
3. **Relevance gate:** a passage must match at least 40% of the question's meaningful words. If nothing passes, Kioo answers "not found" and does not call the model.
4. `prompt` builds the constrained prompt: use only the passages, say NOT_FOUND if they do not answer, treat the documents as untrusted, cite passages as [n].
5. `ollama` calls the local model (temperature 0.1).
6. If the model answers NOT_FOUND, Kioo reports it honestly with no sources.
7. Otherwise the response contains the answer and **sources taken from the index**, not from the model. Citation numbers the model writes are checked: a number that is not a real passage is ignored. The excerpt shown for each source is the best-matching sentences of the real passage.
8. If Ollama is down, the server answers 503 with the passages it found, so the user can still read the sources.

## Decisions and trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| BM25 keyword search, no embeddings | Simple, fast, no extra model, easy to test in two days | It cannot match different words with the same meaning, and it cannot answer a French question from an English-only document |
| 220-word passages (the design document suggested 400 to 700) | More precise sources and a smaller prompt for a 1.5B model | More passages per document; a fact spread across passages may be split |
| Relevance gate before the model | A small model should not be asked questions the documents cannot answer | A question phrased with different words than the document can be rejected |
| Sources come from the index | The model cannot invent a citation | A correct source does not guarantee a correct answer |
| JSON files instead of a database | Zero setup, easy to inspect and delete | Not meant for thousands of documents |
| Server listens on 127.0.0.1 and checks the Host header | The API is not exposed to the network or to DNS-rebinding | Using Kioo from another device needs `HOST` and `ALLOW_REMOTE` set on purpose |

## Known limits

- A small model can still write a wrong answer from a correct passage. The interface says so on every answer.
- Scanned PDFs (images) are not read.
- English and French only have stop words and tested prompts. Other languages may work poorly.
- There is no login. Anyone with access to the computer can use the library.
