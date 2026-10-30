# Privacy

## What stays on your computer

- Imported documents, the passages made from them, and the search index (`server/data/`).
- Your questions and the answers.
- The AI model and its inference (Ollama).

The core workflow (import, search, answer) makes no call to a remote AI provider. There are no analytics, no accounts and no API keys.

## What needs the internet, and when

- Installing the dependencies (`npm install`) and downloading the model (`ollama pull`). After that, Kioo works with the network off.
- Nothing else in the core workflow. Optional online services (voice, cloud retrieval) are **not** part of this version.

Statement for the README and the post:

> Kioo's local mode processes imported documents and questions on your device. The core question-answering workflow does not require uploading your documents to a remote AI provider. Internet access is required initially to obtain the application dependencies and model unless these have already been installed.

## Protections built in

- The server listens only on 127.0.0.1 by default and rejects requests whose Host header is not this computer.
- Uploads are limited to .txt, .md and .pdf, to a size limit, and PDFs must start with `%PDF-`.
- Files are stored under generated ids. Filenames are never used as paths, so path tricks such as `../../` do nothing.
- Document text is treated as untrusted. The prompt tells the model not to follow instructions found inside documents. This reduces, but does not remove, prompt-injection risk.
- Deleting a document removes the original file, its passages and its index entries.
- `server/data/` and `.env` are in `.gitignore`, so documents are never committed.

## What you should know

- Anyone who can use your computer account can read `server/data/`. It is not encrypted.
- Conversation history is kept only in the browser tab and disappears when you close it or press "New conversation".
- Do not put the app on a public server with real documents without adding authentication.
