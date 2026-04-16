import { useRef, useState } from "react";
import { createTicket } from "../api";
import { useLanguage } from "../i18n/LanguageContext";
import type { Ticket, Tenant, Unit } from "../types";
import { StatusBadge } from "./StatusBadge";

const SLA_HOURS: Record<string, number> = { HIGH: 4, MEDIUM: 24, LOW: 72 };

function getSLALabel(ticket: Ticket): { label: string; cls: string } | null {
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") return null;
  const slaH = SLA_HOURS[ticket.priority] ?? 24;
  const elapsed = (Date.now() - new Date(ticket.created_at).getTime()) / 3600000;
  if (elapsed > slaH) return { label: "Überfällig", cls: "sla-exceeded" };
  if (elapsed > slaH * 0.8) return { label: "At Risk", cls: "sla-risk" };
  return null;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 800;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not available")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─── Availability Slots ─── */
interface AvailSlot { date: string; time: string; note: string; }
const EMPTY_SLOT: AvailSlot = { date: "", time: "", note: "" };
const TIME_OPTIONS = [
  "07:00–09:00", "09:00–11:00", "11:00–13:00",
  "13:00–15:00", "15:00–17:00", "17:00–19:00",
];

function AvailabilitySlots({ slots, onChange, disabled }: {
  slots: AvailSlot[];
  onChange: (slots: AvailSlot[]) => void;
  disabled?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const update = (i: number, patch: Partial<AvailSlot>) =>
    onChange(slots.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  return (
    <div className="avail-slots">
      {slots.map((slot, i) => (
        <div key={i} className="avail-slot-row">
          <span className="avail-slot-num">{i + 1}.</span>
          <input
            type="date" value={slot.date} min={today}
            onChange={e => update(i, { date: e.target.value })}
            className="avail-date-input" disabled={disabled}
          />
          <select value={slot.time} onChange={e => update(i, { time: e.target.value })} disabled={disabled} className="avail-time-select">
            <option value="">— Uhrzeit —</option>
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="text" value={slot.note}
            onChange={e => update(i, { note: e.target.value })}
            placeholder="Kommentar (optional)"
            disabled={disabled} className="avail-note-input"
          />
        </div>
      ))}
    </div>
  );
}

/* ─── Ticket Status Timeline ─── */
const STATUS_STEPS = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen", ASSIGNED: "Zugeteilt", IN_PROGRESS: "In Bearbeitung",
  RESOLVED: "Gelöst", CLOSED: "Abgeschlossen",
};

function StatusTimeline({ status }: { status: string }) {
  const idx = STATUS_STEPS.indexOf(status);
  return (
    <div className="status-timeline">
      {STATUS_STEPS.map((step, i) => (
        <div key={step} className={`timeline-step ${i <= idx ? "done" : ""} ${i === idx ? "current" : ""}`}>
          <div className="timeline-dot" />
          {i < STATUS_STEPS.length - 1 && <div className="timeline-line" />}
          <span className="timeline-label">{STATUS_LABELS[step]}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Props ─── */
interface Props {
  units: Unit[];
  tickets: Ticket[];
  tenant: Tenant;
  onTicketCreated: () => void;
  onShowTicket: (ticket: Ticket) => void;
}

export function TenantPortal({ units, tickets, tenant, onTicketCreated }: Props) {
  const { t } = useLanguage();

  const tenantUnit = units.find(u => u.id === tenant.unit_id);
  const myTickets = tickets
    .filter(tk => tk.unit_id === tenant.unit_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  type View = "menu" | "create" | "list" | "detail" | "confirm" | "reschedule";
  const [view, setView]               = useState<View>("menu");
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [confirmedTicket, setConfirmedTicket] = useState<{ id: number; title: string } | null>(null);

  // Form state
  const [title, setTitle]             = useState("");
  const [desc, setDesc]               = useState("");
  const [priority, setPriority]       = useState("MEDIUM");
  const [slots, setSlots]             = useState<AvailSlot[]>([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }]);
  const [imageData, setImageData]     = useState<string | null>(null);
  const [imageName, setImageName]     = useState("");
  const [imageError, setImageError]   = useState("");
  const [submitting, setSubmitting]   = useState(false);

  // Reschedule state
  const [reschedSlots, setReschedSlots] = useState<AvailSlot[]>([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError("");
    if (!file.type.startsWith("image/")) { setImageError("Nur Bilddateien (JPG, PNG, WEBP …)"); return; }
    if (file.size > 10 * 1024 * 1024) { setImageError("Bild zu gross (max. 10 MB)"); return; }
    try {
      setImageData(await compressImage(file));
      setImageName(file.name);
    } catch { setImageError("Bild konnte nicht verarbeitet werden."); }
  };

  const removeImage = () => {
    setImageData(null); setImageName(""); setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setTitle(""); setDesc(""); setPriority("MEDIUM");
    setSlots([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }]);
    removeImage();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) return;
    setSubmitting(true);
    try {
      const filledSlots = slots.filter(s => s.date && s.time);
      const availBlock = filledSlots.length > 0
        ? `\n\nVerfügbarkeit:\n${filledSlots.map((s, i) => `  ${i + 1}. ${s.date} ${s.time}${s.note ? ` (${s.note})` : ""}`).join("\n")}`
        : "";
      const fullDesc = imageData
        ? `${desc.trim()}${availBlock}\n\n[BILD:${imageName}]\n${imageData}`
        : `${desc.trim()}${availBlock}`;

      const created = await createTicket({
        title: title.trim(),
        description: fullDesc,
        unit_id: tenant.unit_id,
        reporter_name: tenant.name,
        priority: priority as "HIGH" | "MEDIUM" | "LOW",
      });

      setConfirmedTicket({ id: (created as { id: number }).id ?? 0, title: title.trim() });
      resetForm();
      onTicketCreated();
      setView("confirm");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && !!title.trim() && !!desc.trim();

  /* ═══ MENU ═══ */
  if (view === "menu") return (
    <div className="portal-page">
      <div className="portal-header">
        <div className="portal-header-icon">⌂</div>
        <div>
          <h2 className="portal-title">{t("portalTitle")}</h2>
          <p className="portal-subtitle">
            {tenantUnit ? `${tenantUnit.name} · ${tenantUnit.floor}` : t("portalSubtitle")}
          </p>
        </div>
      </div>

      <div className="portal-menu-grid">
        <button className="portal-menu-card" onClick={() => setView("create")}>
          <span className="portal-menu-icon">＋</span>
          <span className="portal-menu-label">Neue Meldung</span>
          <span className="portal-menu-desc">Schaden oder Defekt melden</span>
        </button>
        <button className="portal-menu-card" onClick={() => setView("list")}>
          <span className="portal-menu-icon">◎</span>
          <span className="portal-menu-label">Meine Meldungen</span>
          <span className="portal-menu-desc">{myTickets.length} Ticket{myTickets.length !== 1 ? "s" : ""} insgesamt</span>
        </button>
      </div>

      {/* Quick status summary */}
      {myTickets.length > 0 && (
        <div className="portal-status-summary">
          {(["OPEN","IN_PROGRESS","RESOLVED"] as const).map(s => {
            const n = myTickets.filter(tk => tk.status === s).length;
            if (n === 0) return null;
            const colors: Record<string, string> = { OPEN: "var(--accent)", IN_PROGRESS: "var(--warning)", RESOLVED: "var(--success)" };
            const labels: Record<string, string> = { OPEN: "Offen", IN_PROGRESS: "In Bearbeitung", RESOLVED: "Gelöst" };
            return (
              <div key={s} className="portal-summary-chip" style={{ borderColor: colors[s] + "66", color: colors[s] }}>
                <strong>{n}</strong> {labels[s]}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ═══ CREATE FORM ═══ */
  if (view === "create") return (
    <div className="portal-page">
      <div className="portal-back-row">
        <button className="btn btn-ghost" onClick={() => setView("menu")}>← Zurück</button>
        <h2 className="portal-section-title">Neue Meldung einreichen</h2>
      </div>

      <div className="portal-card">
        <form onSubmit={handleSubmit} className="portal-form">

          <div className="portal-form-grid">
            <label className="form-label">
              Titel der Meldung <span className="form-required">*</span>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="z.B. Wasserhahn tropft im Bad" required />
            </label>
            <label className="form-label">
              Priorität
              <select value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="LOW">Niedrig — kein Eilverzug</option>
                <option value="MEDIUM">Mittel — baldige Behebung</option>
                <option value="HIGH">Hoch — sofort handeln</option>
              </select>
            </label>
          </div>

          <label className="form-label">
            Beschreibung <span className="form-required">*</span>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Beschreiben Sie das Problem so genau wie möglich…"
              rows={4} required />
          </label>

          {/* Availability slots */}
          <div className="form-label">
            <span>Wann sind Sie zuhause? <span className="form-optional">(bis zu 3 Terminvorschläge)</span></span>
            <p className="portal-hint" style={{ marginBottom: 10 }}>
              ◷ Wählen Sie Zeitfenster, zu denen der Techniker kommen kann.
            </p>
            <AvailabilitySlots slots={slots} onChange={setSlots} />
          </div>

          {/* Image upload */}
          <div className="form-label">
            <span>Foto / Bild <span className="form-optional">(optional)</span></span>
            {!imageData ? (
              <div className="upload-zone" onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const ev = { target: { files: [f] } } as unknown as React.ChangeEvent<HTMLInputElement>; handleImageChange(ev); } }}>
                <span className="upload-icon">▲</span>
                <span>Bild hier ablegen oder <u>auswählen</u></span>
                <span className="upload-hint">JPG, PNG, WEBP · max. 10 MB</span>
              </div>
            ) : (
              <div className="upload-preview">
                <img src={imageData} alt="Vorschau" className="upload-preview-img" />
                <div className="upload-preview-info">
                  <span>{imageName}</span>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: "0.78rem" }} onClick={removeImage}>✕ Entfernen</button>
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />
            {imageError && <p className="upload-error">{imageError}</p>}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!canSubmit}>
              {submitting ? "Wird eingereicht…" : "✓ Meldung einreichen"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setView("menu")}>Abbrechen</button>
          </div>
        </form>
      </div>
    </div>
  );

  /* ═══ CONFIRMATION SCREEN ═══ */
  if (view === "confirm" && confirmedTicket) return (
    <div className="portal-page">
      <div className="portal-confirm-card">
        <div className="portal-confirm-icon">✓</div>
        <h2 className="portal-confirm-title">Meldung eingereicht!</h2>
        <p className="portal-confirm-sub">Ihre Anfrage wurde erfolgreich übermittelt.</p>

        <div className="portal-confirm-info">
          <div className="portal-confirm-row">
            <span>Ticket-Nr.</span>
            <strong>#{confirmedTicket.id}</strong>
          </div>
          <div className="portal-confirm-row">
            <span>Titel</span>
            <strong>{confirmedTicket.title}</strong>
          </div>
          <div className="portal-confirm-row">
            <span>Status</span>
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>Offen</span>
          </div>
          <div className="portal-confirm-row">
            <span>Techniker</span>
            <span style={{ color: "var(--text-muted)" }}>Wird automatisch zugeteilt</span>
          </div>
        </div>

        <p className="portal-hint" style={{ textAlign: "center" }}>
          ◷ Sie werden benachrichtigt, sobald ein Techniker zugeteilt wurde.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setView("list")}>
            Meine Meldungen anzeigen
          </button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setView("create")}>
            + Neue Meldung
          </button>
        </div>
      </div>
    </div>
  );

  /* ═══ TICKET LIST ═══ */
  if (view === "list") return (
    <div className="portal-page">
      <div className="portal-back-row">
        <button className="btn btn-ghost" onClick={() => setView("menu")}>← Zurück</button>
        <h2 className="portal-section-title">Meine Meldungen</h2>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setView("create")}>+ Neu</button>
      </div>

      {myTickets.length === 0 ? (
        <div className="portal-card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12, opacity: 0.4 }}>◎</div>
          <p style={{ color: "var(--text-muted)" }}>Noch keine Meldungen vorhanden.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setView("create")}>Erste Meldung einreichen</button>
        </div>
      ) : (
        <div className="portal-ticket-list">
          {myTickets.map(ticket => {
            const sla = getSLALabel(ticket);
            return (
              <button key={ticket.id} className="portal-ticket-item" onClick={() => { setDetailTicket(ticket); setView("detail"); }}>
                <div className="portal-ticket-top">
                  <span className="portal-ticket-title">{ticket.title}</span>
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="portal-ticket-meta">
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>#{ticket.id}</span>
                  <span style={{ color: "var(--border)" }}>·</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{formatDate(ticket.created_at)}</span>
                  {sla && <span className={`sla-badge-small ${sla.cls}`}>{sla.label}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ═══ TICKET DETAIL ═══ */
  if (view === "detail" && detailTicket) {
    const lines = detailTicket.description?.split("\n") ?? [];
    const imageLineIdx = lines.findIndex(l => l.startsWith("[BILD:"));
    const visibleDesc = imageLineIdx >= 0 ? lines.slice(0, imageLineIdx).join("\n") : detailTicket.description;
    const imgData = imageLineIdx >= 0 ? lines.slice(imageLineIdx + 1).join("\n") : null;

    return (
      <div className="portal-page">
        <div className="portal-back-row">
          <button className="btn btn-ghost" onClick={() => setView("list")}>← Zurück</button>
          <h2 className="portal-section-title">Meldung #{detailTicket.id}</h2>
        </div>

        <div className="portal-card">
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 4 }}>{detailTicket.title}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Eingereicht: {formatDate(detailTicket.created_at)}</div>
            </div>
            <StatusBadge status={detailTicket.status} />
          </div>

          {/* Status timeline */}
          <StatusTimeline status={detailTicket.status} />

          {/* Description */}
          {visibleDesc && (
            <div className="portal-detail-section">
              <div className="portal-detail-label">Beschreibung</div>
              <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap", margin: 0 }}>{visibleDesc}</p>
            </div>
          )}

          {/* Image */}
          {imgData && (
            <div className="portal-detail-section">
              <div className="portal-detail-label">Foto</div>
              <img src={imgData} alt="Ticket-Foto" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
            </div>
          )}

          {/* Actions */}
          {detailTicket.status === "OPEN" || detailTicket.status === "ASSIGNED" ? (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-ghost" style={{ fontSize: "0.85rem" }}
                onClick={() => { setReschedSlots([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }]); setView("reschedule"); }}>
                ◷ Verfügbarkeit ändern / Termin neu vorschlagen
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  /* ═══ RESCHEDULE ═══ */
  if (view === "reschedule" && detailTicket) return (
    <div className="portal-page">
      <div className="portal-back-row">
        <button className="btn btn-ghost" onClick={() => setView("detail")}>← Zurück</button>
        <h2 className="portal-section-title">Verfügbarkeit ändern</h2>
      </div>

      <div className="portal-card">
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 16 }}>
          Für Ticket #{detailTicket.id} — <strong>{detailTicket.title}</strong>
        </p>
        <p className="portal-hint" style={{ marginBottom: 12 }}>
          ◷ Geben Sie neue Zeitfenster an, zu denen der Techniker kommen kann.
        </p>
        <AvailabilitySlots slots={reschedSlots} onChange={setReschedSlots} />
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary" style={{ flex: 1 }}
            onClick={() => {
              // In a real app this would PATCH the ticket. We show a success message.
              alert("Ihre neuen Terminvorschläge wurden übermittelt. Der Techniker wird sich bei Ihnen melden.");
              setView("detail");
            }}>
            ✓ Neue Verfügbarkeit senden
          </button>
          <button className="btn btn-ghost" onClick={() => setView("detail")}>Abbrechen</button>
        </div>
      </div>
    </div>
  );

  return null;
}
