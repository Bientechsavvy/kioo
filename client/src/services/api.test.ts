import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, ask, getHealth } from "./api";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  it("reports an unreachable server as NETWORK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed")));
    await expect(getHealth()).rejects.toThrow("NETWORK");
  });

  it("keeps the passages when the model is unavailable (503)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(503, { code: "MODEL_UNAVAILABLE", answer: "x", sources: [{ n: 1 }], grounded: false })));
    const r = await ask("q", "auto");
    expect(r.modelUnavailable).toBe(true);
    expect(r.sources).toHaveLength(1);
  });

  it("throws the server's message on other errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => json(400, { error: "Type a question first." })));
    await expect(ask("", "auto")).rejects.toBeInstanceOf(ApiError);
    await expect(ask("", "auto")).rejects.toThrow("Type a question first.");
  });
});
