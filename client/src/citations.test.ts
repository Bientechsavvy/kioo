import { describe, expect, it } from "vitest";
import { splitCitations } from "./citations";
import { TEXT } from "./i18n";

describe("splitCitations", () => {
  it("turns [n] into citation pieces", () => {
    expect(splitCitations("Lock it [1] and test [2].", 3)).toEqual([
      { kind: "text", text: "Lock it " },
      { kind: "cite", n: 1 },
      { kind: "text", text: " and test " },
      { kind: "cite", n: 2 },
      { kind: "text", text: "." },
    ]);
  });
  it("leaves numbers without a real source as plain text", () => {
    const p = splitCitations("See [9].", 2);
    expect(p.every((x) => x.kind === "text")).toBe(true);
    expect(p.map((x) => (x.kind === "text" ? x.text : "")).join("")).toBe("See [9].");
  });
});

describe("interface text", () => {
  const keys = (o: object, prefix = ""): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v, prefix + k + ".") : [prefix + k]));
  it("has every English string in French too", () => {
    expect(keys(TEXT.fr).sort()).toEqual(keys(TEXT.en).sort());
  });
});
