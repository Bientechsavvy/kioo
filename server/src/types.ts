/** Shared types for the Kioo server. */

/** One passage of a document, with the metadata used for source references. */
export interface Chunk {
  id: string;
  documentId: string;
  documentName: string;
  index: number;
  /** PDF page number (1-based). null for plain text and Markdown. */
  page: number | null;
  /** Nearest Markdown heading above the passage, when there is one. */
  section: string | null;
  text: string;
}

export interface DocumentMeta {
  id: string;
  name: string;
    type: "txt" | "md" | "pdf" | "docx" | "html" | "csv" | "json";
  sizeBytes: number;
  words: number;
  chunks: number;
  importedAt: string;
  status: "ready";
}

/** A source shown to the user. All fields come from the index, never from the model. */
export interface SourceRef {
  n: number;
  documentId: string;
  documentName: string;
  page: number | null;
  section: string | null;
  excerpt: string;
  score: number;
  /** True when the model's answer cites this source as [n]. */
  cited: boolean;
}

export type Lang = "en" | "fr";
