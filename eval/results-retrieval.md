# Kioo evaluation (retrieval only)

Sample documents in samples/, questions in eval/questions.json.

- Answerable questions whose source passage was retrieved: **10/10**
- Unanswerable questions rejected by retrieval alone: **1/2** (the others rely on the model to answer NOT_FOUND)

| # | Lang | Question | In documents | Retrieval | Search time |
|---|---|---|---|---|---|
| 1 | en | What precautions should be taken before inspecting an electrical system? | yes | found (rank 1) | 0 ms |
| 2 | en | How do I lock out a circuit? | yes | found (rank 1) | 0 ms |
| 3 | en | How can I prove that a circuit is dead? | yes | found (rank 1) | 1 ms |
| 4 | en | What should I do if someone is in contact with a live source? | yes | found (rank 1) | 0 ms |
| 5 | fr | Comment consigner un circuit ? | yes | found (rank 1) | 0 ms |
| 6 | fr | Que faire si une personne est en contact avec une source sous tension ? | yes | found (rank 1) | 0 ms |
| 7 | en | Why will the solar pump not start? | yes | found (rank 1) | 1 ms |
| 8 | en | How often should the solar panels be cleaned? | yes | found (rank 1) | 0 ms |
| 9 | en | How do I prepare tomato seeds for storage? | yes | found (rank 1) | 0 ms |
| 10 | en | How do I test old seed before planting it? | yes | found (rank 1) | 0 ms |
| 11 | en | Who won the football world cup in 1998? | no | no passages (correct) | 0 ms |
| 12 | en | What is the price of a new solar panel? | no | passages retrieved (model must refuse) | 0 ms |
