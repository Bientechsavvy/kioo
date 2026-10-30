# Demo and offline test

The most important proof for this project is that it keeps working with the internet off.

## Before you start (needs the internet once)

```powershell
npm run install:all
ollama pull qwen2.5:1.5b
npm run build
```

## Run Kioo

```powershell
npm start
```

Open http://127.0.0.1:8787. The status line should show Server running, Model qwen2.5:1.5b ready.

## The offline test (record this)

1. Confirm the model finished downloading: `ollama list` shows `qwen2.5:1.5b`.
2. With the internet **connected**, click "Add a document" and import the four files in `samples/`.
3. Ask: "What precautions should be taken before inspecting an electrical system?" Note the answer, the sources and the time.
4. Turn **Wi-Fi off** (and unplug any cable). The Internet pill in Kioo should change to "disconnected (Kioo still works)".
5. Ask: "How do I lock out a circuit?" and then, in French, "Comment consigner un circuit ?"
6. Click a citation number [1] and check that the source passage really says what the answer says.
7. Ask something the documents do not cover, such as "Who won the football world cup in 1998?" Kioo must say it could not find it.
8. Optional terminal check, still offline: `npm run smoke`.
9. Turn Wi-Fi back on.

If anything fails offline, look for a hidden network dependency and fix it before you claim offline operation. `npm run check:external` lists any web address in the source code other than this computer.

## Evaluation

```powershell
npm run eval                     # retrieval only, repeatable
npm run eval -- --with-model     # also asks your local model and records the time
```

Results are written to `eval/results-retrieval.md` and `eval/results-model.md`. Put your own numbers in the post.

## Recording checklist

- Show `ollama list` and the status pills.
- Show import, a question with sources, the Wi-Fi turned off, and a second question answered.
- Show one question Kioo refuses to answer.
- Keep it under 3 minutes.
