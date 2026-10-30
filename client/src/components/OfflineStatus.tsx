import { Cpu, Database, Globe, Server } from "lucide-react";
import type { ReactNode } from "react";
import type { Health } from "../services/api";
import type { Text } from "../i18n";

interface Props {
  health: Health | null; // null = the server could not be reached
  online: boolean;
  t: Text;
}

type Tone = "ok" | "warn" | "bad";

/**
 * Shows what is actually true right now. "Local" is never shown as green just because the page loaded:
 * the model and the server are checked by the server, and the internet state is shown separately.
 */
export default function OfflineStatus({ health, online, t }: Props) {
  const items: { icon: ReactNode; label: string; text: string; tone: Tone }[] = [];

  items.push({
    icon: <Server size={14} aria-hidden />,
    label: t.status.server,
    text: health ? t.st.serverOk : t.st.serverDown,
    tone: health ? "ok" : "bad",
  });

  let modelText: string = t.st.serverDown;
  let modelTone: Tone = "bad";
  if (health) {
    const o = health.ollama;
    if (!o.reachable) modelText = t.st.modelNoOllama;
    else if (!o.modelInstalled) modelText = `${o.model}: ${t.st.modelNotInstalled} ${o.model}`;
    else {
      modelText = `${o.model}: ${t.st.modelOk}`;
      modelTone = "ok";
    }
  }
  items.push({ icon: <Cpu size={14} aria-hidden />, label: t.status.model, text: modelText, tone: modelTone });

  const docs = health?.storage.documents ?? 0;
  items.push({
    icon: <Database size={14} aria-hidden />,
    label: t.status.library,
    text: docs ? `${docs} ${t.st.libraryN}` : t.st.libraryNone,
    tone: docs ? "ok" : "warn",
  });

  items.push({
    icon: <Globe size={14} aria-hidden />,
    label: t.status.internet,
    text: online ? t.st.online : t.st.offline,
    tone: "warn", // neutral: Kioo does not depend on it either way
  });

  return (
    <ul className="status" aria-label="Status">
      {items.map((i) => (
        <li key={i.label} className={`pill ${i.tone}`}>
          {i.icon}
          <span className="pill-label">{i.label}</span>
          <span>{i.text}</span>
        </li>
      ))}
    </ul>
  );
}
