# Licenses

Kioo's own code is MIT licensed (see ../LICENSE).

## Direct dependencies (read from the installed packages on the day this file was written)

| Package | Version | License |
|---|---|---|
| @types/cors | 2.8.19 | MIT |
| @types/express | 5.0.6 | MIT |
| @types/multer | 2.3.0 | MIT |
| @types/node | 26.6.6 | MIT |
| @types/pdf-parse | 1.1.5 | MIT |
| @types/react | 19.3.0 | MIT |
| @types/react-dom | 19.3.0 | MIT |
| @vitejs/plugin-react | 6.1.2 | MIT |
| cors | 2.8.6 | MIT |
| dotenv | 18.0.9 | BSD-2-Clause |
| express | 5.3.0 | MIT |
| lucide-react | 1.64.0 | ISC |
| multer | 2.5.0 | MIT |
| pdf-parse | 1.1.1 | MIT |
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| tsx | 4.23.15 | MIT |
| typescript | 7.0.2 | Apache-2.0 |
| vite | 8.3.5 | MIT |
| vitest | 5.0.5 | MIT |

Transitive dependencies are not listed here. Check them before you redistribute a packaged build.

## The model

Kioo does not ship a model. You download it with Ollama (`ollama pull qwen2.5:1.5b`).
- **Qwen2.5 1.5B**: I believe the 1.5B size is released under the Apache 2.0 license, but I have not verified it from this environment. Confirm it on https://ollama.com/library/qwen2.5 and the model's own license file before you publish or redistribute.
- Other sizes of Qwen2.5 (for example 3B) can have different license terms. Check each model you switch to.
- The model name is configurable (`OLLAMA_MODEL`), so you can replace it without changing the code.

## Sample documents

The files in samples/ were written for this project's demonstration. They are not professional safety or engineering advice.
