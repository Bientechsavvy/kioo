import path from "path";
// Import the library file directly: the package index runs a debug routine when it has no parent module.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";

export interface ParsedPage {
  page: number | null;
  text: string;
}

/** A problem with the uploaded file that the user can understand. */
export class ParseError extends Error {}

export const ALLOWED_EXTENSIONS = [".txt", ".text", ".log", ".md", ".markdown", ".pdf", ".docx", ".html", ".htm", ".csv", ".json"] as const;
export type DocType = "txt" | "md" | "pdf" | "docx" | "html" | "csv" | "json";

export function typeFromName(filename: string): DocType | null {
  const ext = path.extname(filename).toLowerCase();
  if ([".txt", ".text", ".log"].includes(ext)) return "txt";
  if ([".md", ".markdown"].includes(ext)) return "md";
  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  if ([".html", ".htm"].includes(ext)) return "html";
  if (ext === ".csv") return "csv";
  if (ext === ".json") return "json";
  return null;
}
function parseText(buf: Buffer): ParsedPage[] {
  if (buf.includes(0)) throw new ParseError("This file looks like a binary file, not text.");
  const text = buf.toString("utf8").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  if (!text.trim()) throw new ParseError("The document is empty.");
  return [{ page: null, text }];
}

async function parsePdf(buf: Buffer, maxPages: number): Promise<ParsedPage[]> {
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new ParseError("This file is not a valid PDF.");
  }
  const pages: string[] = [];
  try {
    await pdfParse(buf, {
      max: maxPages,
      // Collect the text of each page so sources can say "page 4".
      pagerender: async (pageData: any) => {
        const content = await pageData.getTextContent({ normalizeWhitespace: true });
        let lastY: number | undefined;
        let text = "";
        for (const item of content.items) {
          const y = item.transform[5];
          text += lastY === undefined || lastY === y ? item.str : "\n" + item.str;
          lastY = y;
        }
        pages.push(text);
        return text;
      },
    });
  } catch (err: any) {
    const name = String(err?.name || "");
    if (name === "PasswordException") throw new ParseError("This PDF is password protected. Remove the password and try again.");
    throw new ParseError("This PDF could not be read. It may be damaged.");
  }
  const result = pages.map((text, i) => ({ page: i + 1, text })).filter((p) => p.text.trim());
  if (!result.length) {
    throw new ParseError("No text was found in this PDF. It may be a scan. Kioo does not read images yet.");
  }
  return result;
}

/** Web pages: drop scripts, styles and tags, keep paragraph breaks, decode the common entities. */
function parseHtml(buf: Buffer): ParsedPage[] {
  const raw = parseText(buf)[0].text;
  const text = raw
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>|<br\s*\/?>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) throw new ParseError("No readable text was found in this web page.");
  return [{ page: null, text }];
}

/** Word documents (.docx). Older .doc files are not supported. */
async function parseDocx(buf: Buffer): Promise<ParsedPage[]> {
  if (buf.subarray(0, 2).toString("latin1") !== "PK") throw new ParseError("This file is not a valid .docx document.");
  try {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    if (!value.trim()) throw new ParseError("No text was found in this Word document.");
    return [{ page: null, text: value.replace(/\r\n?/g, "\n") }];
  } catch (err) {
    if (err instanceof ParseError) throw err;
    throw new ParseError("This Word document could not be read. It may be damaged.");
  }
}

/** Extract text from an uploaded file. Throws ParseError with a readable message. */
export async function parseDocument(buf: Buffer, type: DocType, maxPdfPages = 400): Promise<ParsedPage[]> {
  if (!buf.length) throw new ParseError("The file is empty.");
  if (type === "pdf") return parsePdf(buf, maxPdfPages);
  if (type === "docx") return parseDocx(buf);
  if (type === "html") return parseHtml(buf);
  return parseText(buf); // txt, md, csv and json are read as plain text
  }
