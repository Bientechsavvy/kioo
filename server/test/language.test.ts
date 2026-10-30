import { describe, expect, it } from "vitest";
import { detectLanguage } from "../src/services/language";

describe("detectLanguage", () => {
  it("detects English", () => expect(detectLanguage("What precautions should be taken before inspecting a system?")).toBe("en"));
  it("detects French", () => expect(detectLanguage("Quelles précautions faut-il prendre avant d'inspecter une installation ?")).toBe("fr"));
  it("falls back to English", () => expect(detectLanguage("pump")).toBe("en"));
});
