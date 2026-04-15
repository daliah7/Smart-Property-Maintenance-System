import { useState } from "react";
import type { Tenant, Unit } from "../types";

interface Message {
  id: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  channel: "email" | "sms" | "portal";
  status: "sent" | "draft";
}

const TEMPLATES = [
  { label: "Handwerker-Termin", subject: "Termin für Reparatur in Ihrer Wohnung", body: "Sehr geehrte Mieterin, sehr geehrter Mieter,\n\nfür die gemeldete Reparatur wurde folgender Termin vereinbart:\n\nDatum: [DATUM]\nUhrzeit: [UHRZEIT]\nTechniker: [NAME]\n\nBitte stellen Sie sicher, dass die Wohnung zugänglich ist.\n\nMit freundlichen Grüssen\nIhre Hausverwaltung" },
  { label: "Wartungsankündigung", subject: "Ankündigung: Wartungsarbeiten am [DATUM]", body: "Sehr geehrte Damen und Herren,\n\nwir informieren Sie, dass am [DATUM] folgende Wartungsarbeiten durchgeführt werden:\n\n[BESCHREIBUNG]\n\nDie Arbeiten dauern voraussichtlich von [UHRZEIT] bis [UHRZEIT].\n\nWir bitten um Ihr Verständnis.\n\nMit freundlichen Grüssen\nIhre Hausverwaltung" },
  { label: "Ticket bestätigt", subject: "Ihre Meldung wurde erfasst – Ticket #[NR]", body: "Sehr geehrte/r [NAME],\n\nvielen Dank für Ihre Meldung. Ihr Ticket #[NR] wurde erfasst und wird schnellstmöglich bearbeitet.\n\nSie können den Status jederzeit im Mieter-Portal verfolgen.\n\nMit freundlichen Grüssen\nIhre Hausverwaltung" },
  { label: "Mietzinserhöhung", subject: "Information: Anpassung Mietzins ab [DATUM]", body: "Sehr geehrte Mieterin, sehr geehrter Mieter,\n\nhiermit informieren wir Sie gemäss gesetzlicher Frist über eine Mietzinsanpassung per [DATUM].\n\nNeuer Mietzins: CHF [BETRAG]/Monat\n\nBei Fragen stehen wir gerne zur Verfügung.\n\nMit freundlichen Grüssen\nIhre Hausverwaltung" },
  { label: "Hausordnung Erinnerung", subject: "Erinnerung: Einhaltung der Hausordnung", body: "Sehr geehrte Bewohnerinnen und Bewohner,\n\nwir möchten Sie freundlich an die Einhaltung der Hausordnung erinnern, insbesondere bezüglich:\n\n· Ruhezeiten (22:00–07:00 Uhr)\n· Entsorgung von Abfällen\n· Pflege der Gemeinschaftsräume\n\nVielen Dank für Ihre Kooperation.\n\nMit freundlichen Grüssen\nIhre Hausverwaltung" },
];

const SEED_MESSAGES: Message[] = [
  { id: "1", to: "Weber, Hans (EG-Links)", subject: "Termin für Reparatur in Ihrer Wohnung", body: "", date: "2025-04-10", channel: "email", status: "sent" },
  { id: "2", to: "Alle Mieter – Musterstrasse 12", subject: "Ankündigung: Heizungsservice 15.10.2025", body: "", date: "2025-04-08", channel: "portal", status: "sent" },
  { id: "3", to: "Meier, Anna (1OG-Rechts)", subject: "Ihre Meldung wurde erfasst – Ticket #14", body: "", date: "2025-04-07", channel: "email", status: "sent" },
  { id: "4", to: "Alle Mieter", subject: "Erinnerung: Einhaltung der Hausordnung", body: "", date: "2025-03-28", channel: "email", status: "sent" },
];

const CHANNEL_META = {
  email:  { icon: "✉", label: "E-Mail",  color: "var(--accent)" },
  sms:    { icon: "◈", label: "SMS",     color: "var(--warning)" },
  portal: { icon: "⌂", label: "Portal",  color: "var(--success)" },
};

interface Props { tenants: Tenant[]; units: Unit[]; }

export function KommunikationPage({ tenants, units }: Props) {
  const [messages, setMessages] = useState<Message[]>(SEED_MESSAGES);
  const [showCompose, setShowCompose] = useState(false);
  const [recipient, setRecipient]     = useState("");
  const [subject, setSubject]         = useState("");
  const [body, setBody]               = useState("");
  const [channel, setChannel]         = useState<"email"|"sms"|"portal">("email");
  const [activeTemplate, setActiveTemplate] = useState<number | null>(null);

  const applyTemplate = (idx: number) => {
    setSubject(TEMPLATES[idx].subject);
    setBody(TEMPLATES[idx].body);
    setActiveTemplate(idx);
  };

  const send = () => {
    if (!recipient || !subject) return;
    setMessages(prev => [{
      id: Date.now().toString(), to: recipient, subject, body,
      date: new Date().toISOString().slice(0, 10), channel, status: "sent",
    }, ...prev]);
    setRecipient(""); setSubject(""); setBody(""); setShowCompose(false);
  };

  const recipientOptions = [
    "Alle Mieter",
    "Alle Mieter – Musterstrasse 12",
    "Alle Mieter – Bahnhofstr. 5",
    ...tenants.map(t => {
      const unit = units.find(u => u.id === t.unit_id);
      return `${t.name}${unit ? ` (${unit.name})` : ""}`;
    }),
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">◫ Kommunikation</h2>
          <p className="page-subtitle">Nachrichten an Mieter senden, Vorlagen verwenden, Verlauf einsehen</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCompose(s => !s)}>+ Nachricht verfassen</button>
      </div>

      {/* Compose */}
      {showCompose && (
        <div className="panel kom-compose">
          <h3 className="panel-title" style={{ marginBottom: 16 }}>Nachricht verfassen</h3>

          {/* Templates */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 8 }}>Vorlage wählen:</div>
            <div className="kom-template-row">
              {TEMPLATES.map((tpl, i) => (
                <button key={i} className={`kom-template-btn ${activeTemplate === i ? "active" : ""}`} onClick={() => applyTemplate(i)}>
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="kom-compose-grid">
            <label className="form-label">Empfänger
              <select value={recipient} onChange={e => setRecipient(e.target.value)}>
                <option value="">— auswählen —</option>
                {recipientOptions.map(r => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="form-label">Kanal
              <select value={channel} onChange={e => setChannel(e.target.value as "email"|"sms"|"portal")}>
                <option value="email">✉ E-Mail</option>
                <option value="sms">◈ SMS</option>
                <option value="portal">⌂ Portal-Benachrichtigung</option>
              </select>
            </label>
          </div>
          <label className="form-label" style={{ marginTop: 8 }}>Betreff
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Betreff eingeben…" />
          </label>
          <label className="form-label" style={{ marginTop: 8 }}>Nachricht
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="Nachrichtentext…" />
          </label>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="btn btn-primary" onClick={send} disabled={!recipient || !subject}>✉ Senden</button>
            <button className="btn btn-ghost" onClick={() => setShowCompose(false)}>Abbrechen</button>
          </div>
        </div>
      )}

      {/* Message log */}
      <div className="panel">
        <h3 className="panel-title" style={{ marginBottom: 16 }}>Versandverlauf</h3>
        <div className="kom-log">
          {messages.map(msg => {
            const ch = CHANNEL_META[msg.channel];
            return (
              <div key={msg.id} className="kom-log-row">
                <span className="kom-channel-badge" style={{ color: ch.color, background: ch.color + "18", border: `1px solid ${ch.color}33` }}>
                  {ch.icon} {ch.label}
                </span>
                <div className="kom-log-info">
                  <span className="kom-log-subject">{msg.subject}</span>
                  <span className="kom-log-to">An: {msg.to}</span>
                </div>
                <span className="kom-log-date">{msg.date}</span>
                <span className="kom-log-status">✓ Gesendet</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
