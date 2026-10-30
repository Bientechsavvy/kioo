import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseDocument, typeFromName, ParseError } from "../src/services/documentParser";
import { SAMPLES } from "./helpers";

describe("typeFromName", () => {
  it("accepts only text, Markdown and PDF", () => {
    expect(typeFromName("a.TXT")).toBe("txt");
    expect(typeFromName("a.md")).toBe("md");
    expect(typeFromName("a.pdf")).toBe("pdf");
    expect(typeFromName("a.exe")).toBeNull();
    expect(typeFromName("a.pdf.exe")).toBeNull();
    expect(typeFromName("noextension")).toBeNull();
  });
});

describe("parseDocument", () => {
  it("reads text and removes the BOM", async () => {
    const pages = await parseDocument(Buffer.from("﻿Hello\r\nworld"), "txt");
    expect(pages).toEqual([{ page: null, text: "Hello\nworld" }]);
  });

  it("rejects empty files", async () => {
    await expect(parseDocument(Buffer.alloc(0), "txt")).rejects.toBeInstanceOf(ParseError);
    await expect(parseDocument(Buffer.from("   \n "), "txt")).rejects.toBeInstanceOf(ParseError);
  });

  it("rejects binary data posing as text", async () => {
    await expect(parseDocument(Buffer.from([0x4d, 0x5a, 0, 1, 2]), "txt")).rejects.toThrow(/binary/);
  });

  it("reads a PDF page by page", async () => {
    const buf = fs.readFileSync(path.join(SAMPLES, "electrical_safety_guide.pdf"));
    const pages = await parseDocument(buf, "pdf");
    expect(pages.map((p) => p.page)).toEqual([1, 2, 3]);
    expect(pages[0].text).toContain("Electrical Safety Guide");
    expect(pages[1].text.toLowerCase()).toContain("lockout");
  });

  it("rejects a file that only claims to be a PDF", async () => {
    await expect(parseDocument(Buffer.from("not a pdf"), "pdf")).rejects.toThrow(/not a valid PDF/);
  });

  it("rejects a damaged PDF with a readable message", async () => {
    await expect(parseDocument(Buffer.from("%PDF-1.4\nbroken broken broken"), "pdf")).rejects.toBeInstanceOf(ParseError);
  });
});
