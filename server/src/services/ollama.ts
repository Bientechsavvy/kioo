import { config } from "../config";

/** Ollama is not running, or the model is not installed. */
export class ModelUnavailableError extends Error {}

export interface OllamaStatus {
  reachable: boolean;
  model: string;
  modelInstalled: boolean;
}

export interface ModelClient {
  check(): Promise<OllamaStatus>;
  generate(system: string, user: string): Promise<string>;
}

/** Talks to the Ollama server on this computer. Nothing leaves the machine. */
export function createOllamaClient(opts = { url: config.ollamaUrl, model: config.model, timeoutMs: config.ollamaTimeoutMs }): ModelClient {
  return {
    async check() {
      try {
        const res = await fetch(`${opts.url}/api/tags`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) return { reachable: false, model: opts.model, modelInstalled: false };
        const data = (await res.json()) as { models?: { name: string }[] };
        const names = (data.models ?? []).map((m) => m.name);
        const installed = names.some((n) => n === opts.model || n === `${opts.model}:latest`);
        return { reachable: true, model: opts.model, modelInstalled: installed };
      } catch {
        return { reachable: false, model: opts.model, modelInstalled: false };
      }
    },

    async generate(system, user) {
      let res: Response;
      try {
        res = await fetch(`${opts.url}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(opts.timeoutMs),
          body: JSON.stringify({
            model: opts.model,
            stream: false,
            options: { temperature: 0.1, num_ctx: 4096 },
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
        });
      } catch {
        throw new ModelUnavailableError("Ollama is not reachable. Start it and try again.");
      }
      if (res.status === 404) {
        throw new ModelUnavailableError(`The model ${opts.model} is not installed. Run: ollama pull ${opts.model}`);
      }
      if (!res.ok) throw new ModelUnavailableError(`Ollama returned an error (${res.status}).`);
      const data = (await res.json()) as { message?: { content?: string } };
      const text = data.message?.content?.trim();
      if (!text) throw new ModelUnavailableError("The model returned an empty answer.");
      return text;
    },
  };
}
