import { useCallback, useEffect, useState } from "react";
import ChatWindow from "./components/ChatWindow";
import DocumentLibrary from "./components/DocumentLibrary";
import type { Message } from "./components/MessageBubble";
import OfflineStatus from "./components/OfflineStatus";
import SourceReference from "./components/SourceReference";
import { TEXT, type UiLang } from "./i18n";
import * as api from "./services/api";

let nextId = 1;

export default function App() {
  const [ui, setUi] = useState<UiLang>(() => (navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en"));
  const t = TEXT[ui];

  const [health, setHealth] = useState<api.Health | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [documents, setDocuments] = useState<api.DocumentInfo[]>([]);
  const [libBusy, setLibBusy] = useState(false);
  const [libError, setLibError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeSource, setActiveSource] = useState<number | null>(null);
  const [language, setLanguage] = useState<"auto" | "en" | "fr">("auto");

  const message = (e: unknown) => (e instanceof api.ApiError ? (e.message === "NETWORK" ? t.errNetwork : e.message) : t.errGeneric);

  const refresh = useCallback(async () => {
    try {
      setHealth(await api.getHealth());
      setDocuments(await api.listDocuments());
    } catch {
      setHealth(null);
    }
  }, []);

  // Check the server and the model on start, then every few seconds, so the status is never stale.
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 8000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [refresh]);

  const upload = async (file: File) => {
    setLibBusy(true);
    setLibError("");
    try {
      await api.uploadDocument(file);
      await refresh();
    } catch (e) {
      setLibError(message(e));
    } finally {
      setLibBusy(false);
    }
  };

  const remove = async (doc: api.DocumentInfo) => {
    if (!window.confirm(`${t.removeConfirm}\n\n${doc.name}`)) return;
    setLibError("");
    try {
      await api.deleteDocument(doc.id);
      await refresh();
    } catch (e) {
      setLibError(message(e));
    }
  };

  const ask = async (question: string) => {
    const userMsg: Message = { id: nextId++, role: "user", text: question, sources: [], grounded: false };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    const id = nextId++;
    try {
      const r = await api.ask(question, language);
      setMessages((m) => [...m, { id, role: "assistant", text: r.answer, sources: r.sources, grounded: r.grounded, problem: r.modelUnavailable }]);
      setSelectedId(id);
      setActiveSource(null);
    } catch (e) {
      setMessages((m) => [...m, { id, role: "assistant", text: message(e), sources: [], grounded: false, problem: true }]);
    } finally {
      setLoading(false);
      refresh();
    }
  };

  const selected = messages.find((m) => m.id === selectedId);

  const cite = (id: number, n: number) => {
    setSelectedId(id);
    setActiveSource(n);
    setTimeout(() => document.getElementById(`source-${n}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo" aria-hidden>
            ✦
          </span>
          <div>
            <h1>Kioo</h1>
            <p>{t.tagline}</p>
          </div>
        </div>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setMessages([]);
            setSelectedId(null);
          }}
        >
          {t.newChat}
        </button>
        <DocumentLibrary documents={documents} busy={libBusy} error={libError} onUpload={upload} onRemove={remove} t={t} />
        <section className="privacy" aria-labelledby="privacy-title">
          <h2 id="privacy-title">{t.privacyTitle}</h2>
          <p>{t.privacy}</p>
        </section>
        <div className="ui-lang" role="group" aria-label="Interface language">
          <button type="button" aria-pressed={ui === "en"} onClick={() => setUi("en")}>
            EN
          </button>
          <button type="button" aria-pressed={ui === "fr"} onClick={() => setUi("fr")}>
            FR
          </button>
        </div>
      </aside>

      <main className="main">
        <OfflineStatus health={health} online={online} t={t} />
        <ChatWindow
          messages={messages}
          loading={loading}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setActiveSource(null);
          }}
          onCite={cite}
          onAsk={ask}
          language={language}
          onLanguage={setLanguage}
          t={t}
        />
      </main>

      <aside className="sources" aria-labelledby="sources-title">
        <h2 id="sources-title">{t.sources}</h2>
        {selected && selected.sources.length > 0 ? (
          selected.sources.map((s) => <SourceReference key={s.n} source={s} active={activeSource === s.n} t={t} />)
        ) : (
          <p className="hint">{t.noSources}</p>
        )}
      </aside>
    </div>
  );
}
