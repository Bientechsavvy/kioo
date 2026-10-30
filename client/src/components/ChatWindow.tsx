import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Text } from "../i18n";
import MessageBubble, { type Message } from "./MessageBubble";

interface Props {
  messages: Message[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCite: (id: number, n: number) => void;
  onAsk: (question: string) => void;
  language: "auto" | "en" | "fr";
  onLanguage: (l: "auto" | "en" | "fr") => void;
  t: Text;
}

export default function ChatWindow({ messages, loading, selectedId, onSelect, onCite, onAsk, language, onLanguage, t }: Props) {
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  const submit = () => {
    const q = text.trim();
    if (!q || loading) return;
    setText("");
    onAsk(q);
  };

  return (
    <section className="chat" aria-label="Conversation">
      <div className="messages" aria-live="polite">
        {messages.length === 0 && (
          <div className="welcome">
            <h2>{t.welcomeTitle}</h2>
            <p>{t.welcome}</p>
            <p className="hint">{t.examplesLabel}</p>
            <div className="examples">
              {t.examples.map((q) => (
                <button key={q} type="button" className="chip" onClick={() => setText(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} selected={m.id === selectedId} onSelect={() => onSelect(m.id)} onCite={(n) => onCite(m.id, n)} t={t} />
        ))}
        {loading && <p className="loading">{t.searching}</p>}
        <div ref={end} />
      </div>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor="question">
          {t.placeholder}
        </label>
        <textarea
          id="question"
          rows={2}
          value={text}
          placeholder={t.placeholder}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="composer-row">
          <label className="lang">
            {t.answerLang}
            <select value={language} onChange={(e) => onLanguage(e.target.value as "auto" | "en" | "fr")}>
              <option value="auto">{t.auto}</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
          <button type="submit" className="primary" disabled={loading || !text.trim()}>
            <Send size={16} aria-hidden /> {t.send}
          </button>
        </div>
      </form>
    </section>
  );
}
