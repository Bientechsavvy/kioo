/** All calls to the local Kioo server. The interface never talks to any other address. */

export interface Health {
  backend: boolean;
  ollama: { reachable: boolean; model: string; modelInstalled: boolean };
  storage: { available: boolean; documents: number; passages: number };
  version: string;
}

export interface DocumentInfo {
  id: string;
  name: string;
    type: "txt" | "md" | "pdf" | "docx" | "html" | "csv" | "json";
  sizeBytes: number;
  words: number;
  chunks: number;
  importedAt: string;
}

export interface Source {
  n: number;
  documentId: string;
  documentName: string;
  page: number | null;
  section: string | null;
  excerpt: string;
  score: number;
  cited: boolean;
}

export interface ChatReply {
  answer: string;
  sources: Source[];
  grounded: boolean;
  reason?: "no_documents" | "no_evidence" | "model_not_found";
  language: "en" | "fr";
  model?: string;
  timings?: { retrievalMs?: number; modelMs?: number };
  /** Set when the model was unavailable but passages were still found. */
  modelUnavailable?: boolean;
}

export class ApiError extends Error {}

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function request(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError("NETWORK");
  }
  return { res, body: res.status === 204 ? {} : await readJson(res) };
}

export async function getHealth(): Promise<Health> {
  const { res, body } = await request("/api/health");
  if (!res.ok) throw new ApiError("NETWORK");
  return body as Health;
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  const { res, body } = await request("/api/documents");
  if (!res.ok) throw new ApiError(body.error || "Could not load documents.");
  return body.documents;
}

export async function uploadDocument(file: File): Promise<DocumentInfo> {
  const form = new FormData();
  form.append("file", file);
  const { res, body } = await request("/api/documents", { method: "POST", body: form });
  if (!res.ok) throw new ApiError(body.error || "The document could not be imported.");
  return body.document;
}

export async function deleteDocument(id: string): Promise<void> {
  const { res, body } = await request(`/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new ApiError(body.error || "The document could not be removed.");
}

export async function ask(question: string, language: "auto" | "en" | "fr"): Promise<ChatReply> {
  const { res, body } = await request("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, language }),
  });
  if (res.status === 503 && body.code === "MODEL_UNAVAILABLE") return { ...body, modelUnavailable: true } as ChatReply;
  if (!res.ok) throw new ApiError(body.error || "Something went wrong.");
  return body as ChatReply;
}
