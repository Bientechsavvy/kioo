---
title: Kioo: when the internet disappears, knowledge stays
published: false
tags: devchallenge, hf26challenge
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine](https://dev.to/challenges/hacktoberfest-week4-2026-10-26)*

## What I Built

Somewhere there is a manual nobody opens, a teacher's notes in an old folder, a community's knowledge sitting in a file. The internet drops, and that knowledge becomes a ghost: still there, but out of reach.

Kioo gives that stored knowledge a voice. It is an offline-first AI assistant that answers from the documents on your own computer, shows the exact passage behind every answer, and keeps working with the internet turned off. Import a document, ask in English or French, and a local open-weight model answers using only your passages. If your documents do not contain the answer, Kioo says so.

The AI does not pretend to talk to spirits. It is a local interpreter for knowledge that would otherwise stay hidden.

## Demo

- Project website (it describes Kioo; the AI runs on your own computer): [ADD YOUR RENDER URL]
- Demo video (about 3 minutes): [ADD YOUR VIDEO LINK]

What the video shows: [CONFIRM AFTER YOU RECORD IT] import a document with the internet on, ask a question and see the sources, turn Wi-Fi off, ask again and get an answer, then ask something the documents do not cover and watch Kioo refuse.

[ADD 2 REAL SCREENSHOTS FROM YOUR OWN RUN]

## Code

{% embed https://github.com/[YOUR-GITHUB-NAME]/kioo %}

TypeScript, MIT licensed, 52 automated tests (46 server, 6 client).

## How I Built It

- **Interface:** React + TypeScript + Vite. Status pills show what is actually true (server, model installed, documents, internet), so "offline" is never a decoration.
- **Local API:** Node.js + Express + TypeScript on `127.0.0.1`. It also rejects requests with a foreign Host header.
- **Model:** [Ollama](https://ollama.com) running `qwen2.5:1.5b` ([CONFIRM THE MODEL YOU REALLY USED]). The model name is a setting.
- **Documents:** text, Markdown and PDF. PDFs are read page by page so a source can say "page 4".
- **Retrieval:** a small BM25 keyword search written for this project, with accents removed and stop words dropped in English and French. A passage must match enough of the question or Kioo stops and says "not found" without calling the model.
- **Grounded answers:** the prompt allows only the supplied passages and asks the model to answer `NOT_FOUND` otherwise. The sources shown to the user come from the index, not from the model, and a citation number the model invents is ignored.
- **Honest limits:** a small model can still misread a correct passage, so every answer carries a reminder to check the sources.

I used BM25 instead of embeddings on purpose. It is fast, needs no second model, and can be tested in two days. The cost is that it cannot match different words with the same meaning.

### Does it work?

I wrote a 12-question evaluation over four small sample documents. Retrieval found the right passage for 10 of 10 answerable questions, and stopped 1 of 2 unanswerable ones by itself (the other relies on the model to say NOT_FOUND). That is an easy test: small documents, one author.

My results with the real model on my laptop: [RUN `npm run eval -- --with-model` AND PASTE YOUR NUMBERS: answers judged supported, average seconds per answer, your CPU]

The offline test: [WRITE WHAT REALLY HAPPENED WHEN YOU TURNED WI-FI OFF. Be honest about speed and mistakes.]

## Why Does Open Innovation Matter?

The point of Kioo is that it still works when the connection does not. That is only possible because the model is open-weight: I can download it once and run it on a laptop with no internet and no API key. A closed API would stop working the moment the network did, and every document I asked about would have to leave my computer.

Open also means I can swap the model with one setting, read exactly how retrieval and the prompt work, and change them. The trade-off is real: a 1.5B model is slower and less capable than a hosted giant, which is why Kioo is built around showing its sources rather than trusting its answers.

## My Agent Session

[OPTIONAL: ADD YOUR DEVRELAY LINK, OR DELETE THIS SECTION]

## The Spirit of It

Knowledge should not disappear just because a connection does. A student in a village with unstable data, a technician with a manual and no signal, a family keeping a recipe book: they should still be able to ask a question and get an answer they can check.

[OPTIONAL, ONLY IF TRUE: ADD A REAL MOMENT, OR A REAL PERSON'S WORDS WITH PERMISSION. DO NOT INVENT ONE. Delete this line otherwise.]

## Prize Categories

- Best Use of Render: [ONLY IF THE WEBSITE IS REALLY DEPLOYED ON RENDER]

Not entered: Backboard, ElevenLabs, Browserbase and Tinker are not used in this version.
Gemma: [ONLY IF YOU REALLY RAN A GEMMA MODEL, e.g. `OLLAMA_MODEL=gemma3:1b`. OTHERWISE DELETE.]

<!-- Thanks for participating! -->
