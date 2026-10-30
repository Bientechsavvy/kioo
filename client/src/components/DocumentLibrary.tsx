import { FileUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { Text } from "../i18n";
import type { DocumentInfo } from "../services/api";

interface Props {
  documents: DocumentInfo[];
  busy: boolean;
  error: string;
  onUpload: (file: File) => void;
  onRemove: (doc: DocumentInfo) => void;
  t: Text;
}

export default function DocumentLibrary({ documents, busy, error, onUpload, onRemove, t }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const pick = (files: FileList | null) => {
    if (files && files[0]) onUpload(files[0]);
    if (input.current) input.current.value = "";
  };

  return (
    <section aria-labelledby="library-title" className="library">
      <h2 id="library-title">{t.library}</h2>
      <div
        className={`drop ${drag ? "drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files);
        }}
      >
        <button type="button" className="primary" disabled={busy} onClick={() => input.current?.click()}>
          <FileUp size={16} aria-hidden /> {busy ? t.importing : t.import}
        </button>
        <p className="hint">{t.importHint}</p>
        <input ref={input} type="file" accept=".txt,.text,.log,.md,.markdown,.pdf,.docx,.html,.htm,.csv,.json" hidden onChange={(e) => pick(e.target.files)} />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {documents.length === 0 ? (
        <p className="hint">{t.noDocs}</p>
      ) : (
        <ul className="doclist">
          {documents.map((d) => (
            <li key={d.id}>
              <div>
                <strong title={d.name}>{d.name}</strong>
                <span className="hint">
                  {d.type.toUpperCase()} · {d.chunks} {t.passages}
                </span>
              </div>
              <button type="button" className="icon" aria-label={`${t.remove}: ${d.name}`} title={t.remove} onClick={() => onRemove(d)}>
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
