import { useEffect, useRef, useState } from "react";
import { sendAIChat } from "../api";
import { useLanguage } from "../i18n/LanguageContext";
import type { AIMessage } from "../types";

export function AIChat() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: t("aiWelcome") }]);
    }
  }, [open, messages.length, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const { reply } = await sendAIChat(text);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Verbindungsfehler. Bitte versuchen Sie es erneut." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const formatMessage = (text: string) => {
    // Convert **bold** and newlines to HTML-safe spans
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={i}>
          {parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={j}>{part.slice(2, -2)}</strong>
              : part
          )}
          {i < text.split("\n").length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <>
      {/* Floating button */}
      <button
        className={`ai-fab ${open ? "ai-fab-open" : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-label={t("aiTitle")}
        title={t("aiTitle")}
      >
        {open ? "✕" : "🤖"}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <span className="ai-panel-title">🤖 {t("aiTitle")}</span>
            <span className="ai-panel-sub">{t("aiSubtitle")}</span>
          </div>

          <div className="ai-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ai-bubble ai-bubble-${msg.role}`}>
                {formatMessage(msg.content)}
              </div>
            ))}
            {loading && (
              <div className="ai-bubble ai-bubble-assistant ai-typing">
                <span /><span /><span />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="ai-input-row">
            <input
              className="ai-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t("aiPlaceholder")}
              disabled={loading}
            />
            <button className="ai-send-btn" onClick={send} disabled={loading || !input.trim()}>
              {loading ? "…" : "↑"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
