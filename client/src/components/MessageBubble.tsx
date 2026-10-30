import { AlertTriangle, CircleCheck, SearchX } from "lucide-react";
import { splitCitations } from "../citations";
import type { Text } from "../i18n";
import type { Source } from "../services/api";

export interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  sources: Source[];
  grounded: boolean;
  /** Something went wrong, or the model was unavailable. */
  problem?: boolean;
}

interface Props {
  message: Message;
  selected: boolean;
  onSelect: () => void;
  onCite: (n: number) => void;
  t: Text;
}

export default function MessageBubble({ message, selected, onSelect, onCite, t }: Props) {
  if (message.role === "user") {
    return (
      <div className="bubble user">
        <p>{message.text}</p>
      </div>
    );
  }

  const pieces = splitCitations(message.text, message.sources.length);
  const state = message.problem ? "problem" : message.grounded ? "grounded" : "notfound";

  return (
    <div className={`bubble assistant ${state} ${selected ? "selected" : ""}`}>
      <div className="state-line">
        {state === "grounded" && (
          <>
            <CircleCheck size={15} aria-hidden /> {t.supported} {message.sources.length} {t.sourcesWord}
          </>
        )}
        {state === "notfound" && (
          <>
            <SearchX size={15} aria-hidden /> {t.foundNot}
          </>
        )}
        {state === "problem" && (
          <>
            <AlertTriangle size={15} aria-hidden /> {t.problem}
          </>
        )}
      </div>
      <p>
        {pieces.map((p, i) =>
          p.kind === "text" ? (
            <span key={i}>{p.text}</span>
          ) : (
            <button key={i} type="button" className="cite" onClick={() => onCite(p.n)} aria-label={`${t.sources} ${p.n}`}>
              {p.n}
            </button>
          ),
        )}
      </p>
      {message.sources.length > 0 && (
        <button type="button" className="link" onClick={onSelect}>
          {t.sources} ({message.sources.length})
        </button>
      )}
      {state === "grounded" && <p className="warn-small">{t.modelWarn}</p>}
    </div>
  );
}
