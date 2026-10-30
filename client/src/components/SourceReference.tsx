import { FileText } from "lucide-react";
import type { Source } from "../services/api";
import type { Text } from "../i18n";

interface Props {
  source: Source;
  active: boolean;
  t: Text;
}

/** One source passage. Every field comes from the document index, not from the model. */
export default function SourceReference({ source, active, t }: Props) {
  const where = [source.page ? `${t.page} ${source.page}` : null, source.section].filter(Boolean).join(" · ");
  return (
    <article className={`source ${active ? "active" : ""}`} id={`source-${source.n}`}>
      <header>
        <span className="source-n">{source.n}</span>
        <FileText size={14} aria-hidden />
        <strong>{source.documentName}</strong>
        {source.cited && <span className="badge">{t.cited}</span>}
      </header>
      {where && <p className="source-where">{where}</p>}
      <blockquote>{source.excerpt}</blockquote>
    </article>
  );
}
