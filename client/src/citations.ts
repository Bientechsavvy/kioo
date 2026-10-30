/** Split an answer into text pieces and citation markers like [1], so markers can become buttons. */
export type Piece = { kind: "text"; text: string } | { kind: "cite"; n: number };

export function splitCitations(answer: string, maxSource: number): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of answer.matchAll(/\[(\d{1,2})\]/g)) {
    const n = Number(m[1]);
    if (n < 1 || n > maxSource) continue; // a number with no real source stays plain text
    if (m.index! > last) out.push({ kind: "text", text: answer.slice(last, m.index) });
    out.push({ kind: "cite", n });
    last = m.index! + m[0].length;
  }
  if (last < answer.length) out.push({ kind: "text", text: answer.slice(last) });
  return out;
}
