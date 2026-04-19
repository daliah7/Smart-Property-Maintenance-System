import { useRef, useState } from "react";
import { createTicket } from "../api";
import { autoDetectPriority } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import type { Ticket, Tenant, Unit } from "../types";
import { StatusBadge } from "./StatusBadge";

const SLA_HOURS: Record<string, number> = { HIGH: 24, MEDIUM: 168, LOW: 336 };

/* ─── Auto-Priority Detection ─── */

function getSLALabel(ticket: Ticket, t: (k: Parameters<ReturnType<typeof useLanguage>["t"]>[0]) => string): { label: string; cls: string } | null {
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") return null;
  const slaH = SLA_HOURS[ticket.priority] ?? 24;
  const elapsed = (Date.now() - new Date(ticket.created_at).getTime()) / 3600000;
  if (elapsed > slaH) return { label: t("slaExceeded"), cls: "sla-exceeded" };
  if (elapsed > slaH * 0.8) return { label: t("slaAtRisk"), cls: "sla-risk" };
  return null;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function parseFirstSlot(description: string): { date: string; time: string } | null {
  if (!description) return null;
  const m = description.match(/1\.\s+(\d{4}-\d{2}-\d{2})\s+([^\n(]+)/);
  if (!m) return null;
  return { date: m[1].trim(), time: m[2].trim() };
}

function formatVisitMessage(date: string, time: string, techName?: string): string {
  const d = new Date(date + "T12:00:00");
  const formatted = new Intl.DateTimeFormat("de-CH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(d);
  const who = techName ?? "Ihr Techniker";
  return `${who} wird am ${formatted} zwischen ${time} Uhr bei Ihnen eintreffen.`;
}

function stripAvailBlock(text: string): string {
  return (text ?? "").split(/\n\n[\s\S]*?1\. \d{4}/)[0].trim();
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
          <input type="date" value={slot.date} min={today}
            onChange={e => update(i, { date: e.target.value })}
            className="avail-date-input" disabled={disabled} />
          <select value={slot.time} onChange={e => update(i, { time: e.target.value })}
            disabled={disabled} className="avail-time-select">
            <option value="">— Zeit —</option>
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="text" value={slot.note} onChange={e => update(i, { note: e.target.value })}
            placeholder="Kommentar (optional)" disabled={disabled} className="avail-note-input" />
        </div>
      ))}
    </div>
  );
}

/* ─── Status Timeline ─── */
const STATUS_STEPS = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

function StatusTimeline({ status, labels }: { status: string; labels: Record<string, string> }) {
  const idx = STATUS_STEPS.indexOf(status);
  return (
    <div className="status-timeline">
      {STATUS_STEPS.map((step, i) => (
        <div key={step} className={`timeline-step ${i <= idx ? "done" : ""} ${i === idx ? "current" : ""}`}>
          <div className="timeline-dot" />
          {i < STATUS_STEPS.length - 1 && <div className="timeline-line" />}
          <span className="timeline-label">{labels[step] ?? step}</span>
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
  onTicketCreated: (ticket: Ticket) => string | undefined;
  onShowTicket: (ticket: Ticket) => void;
}

export function TenantPortal({ units, tickets, tenant, onTicketCreated }: Props) {
  const { t } = useLanguage();

  const tenantUnit = units.find(u => u.id === tenant.unit_id);
  const myTickets = tickets
    .filter(tk => tk.unit_id === tenant.unit_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const statusLabels: Record<string, string> = {
    OPEN: t("portalStatusOpen"), ASSIGNED: t("portalStatusAssigned"),
    IN_PROGRESS: t("portalStatusInProgress"), RESOLVED: t("portalStatusResolved"),
    CLOSED: t("portalStatusClosed"),
  };

  type View = "menu" | "create" | "list" | "detail" | "confirm" | "reschedule";
  const [view, setView]                     = useState<View>("menu");
  const [detailTicket, setDetailTicket]     = useState<Ticket | null>(null);
  const [confirmedTicket, setConfirmedTicket] = useState<{ id: number; title: string; technicianName?: string; firstSlot?: { date: string; time: string } } | null>(null);

  const [title, setTitle]           = useState("");
  const [desc, setDesc]             = useState("");
  const [slots, setSlots]           = useState<AvailSlot[]>([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }]);
  const autoPriority = autoDetectPriority(title, desc);
  const [imageData, setImageData]   = useState<string | null>(null);
  const [imageName, setImageName]   = useState("");
  const [imageError, setImageError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [reschedSlots, setReschedSlots] = useState<AvailSlot[]>([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError("");
    if (!file.type.startsWith("image/")) { setImageError("Nur Bilddateien (JPG, PNG, WEBP …)"); return; }
    if (file.size > 10 * 1024 * 1024) { setImageError("Bild zu gross (max. 10 MB)"); return; }
    try { setImageData(await compressImage(file)); setImageName(file.name); }
    catch { setImageError("Bild konnte nicht verarbeitet werden."); }
  };

  const removeImage = () => {
    setImageData(null); setImageName(""); setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setTitle(""); setDesc("");
    setSlots([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }]);
    removeImage();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    const filledSlots = slots.filter(s => s.date && s.time);
    const availBlock = filledSlots.length > 0
      ? `\n\n${t("portalAvailability")}:\n${filledSlots.map((s, i) => `  ${i + 1}. ${s.date} ${s.time}${s.note ? ` (${s.note})` : ""}`).join("\n")}`
      : "";
    const fullDesc = imageData
      ? `${desc.trim()}${availBlock}\n\n[BILD:${imageName}]\n${imageData}`
      : `${desc.trim()}${availBlock}`;
    const detectedPriority = autoDetectPriority(title.trim(), desc.trim());
    const now = new Date().toISOString();
    try {
      const created = await createTicket({
        title: title.trim(), description: fullDesc,
        unit_id: tenant.unit_id, reporter_name: tenant.name,
        priority: detectedPriority,
      });
      const newTicket: Ticket = {
        id: (created as { id: number }).id ?? 0,
        title: title.trim(), description: fullDesc,
        unit_id: tenant.unit_id, tenant_id: tenant.id,
        technician_id: undefined, status: "OPEN",
        priority: detectedPriority, created_at: now, updated_at: now,
      };
      const techName = onTicketCreated(newTicket);
      const firstSlot = filledSlots[0] ? { date: filledSlots[0].date, time: filledSlots[0].time } : undefined;
      resetForm(); setConfirmedTicket({ id: newTicket.id, title: newTicket.title, technicianName: techName, firstSlot }); setView("confirm");
    } catch {
      // Backend offline — create ticket locally and auto-assign immediately
      const newId = Math.max(10000, Date.now() % 1000000);
      const newTicket: Ticket = {
        id: newId, title: title.trim(), description: fullDesc,
        unit_id: tenant.unit_id, tenant_id: tenant.id,
        technician_id: undefined, status: "OPEN",
        priority: detectedPriority, created_at: now, updated_at: now,
      };
      const techName = onTicketCreated(newTicket);
      const firstSlot = filledSlots[0] ? { date: filledSlots[0].date, time: filledSlots[0].time } : undefined;
      resetForm(); setConfirmedTicket({ id: newId, title: title.trim(), technicianName: techName, firstSlot }); setView("confirm");
    } finally {
      setSubmitting(false);
    }
  };

  const prioMeta = {
    HIGH:   { label: t("portalPrioHigh"),   sub: t("portalPrioHighSub"),   color: "var(--danger)"  },
    MEDIUM: { label: t("portalPrioMedium"), sub: t("portalPrioMediumSub"), color: "var(--warning)" },
    LOW:    { label: t("portalPrioLow"),    sub: t("portalPrioLowSub"),    color: "var(--success)" },
  };

  /* ═══ MENU ═══ */
  if (view === "menu") return (
    <div className="portal-page">
      <div className="portal-header">
        <div className="portal-header-icon">⌂</div>
        <div>
          <h2 className="portal-title">{t("portalTitle")}</h2>
          <p className="portal-subtitle">{tenantUnit ? `${tenantUnit.name} · ${tenantUnit.floor}` : t("portalSubtitle")}</p>
        </div>
      </div>
      <div className="portal-menu-grid">
        <button className="portal-menu-card" onClick={() => setView("create")}>
          <span className="portal-menu-icon">＋</span>
          <span className="portal-menu-label">{t("portalMenuNew")}</span>
          <span className="portal-menu-desc">{t("portalMenuNewDesc")}</span>
        </button>
        <button className="portal-menu-card" onClick={() => setView("list")}>
          <span className="portal-menu-icon">◎</span>
          <span className="portal-menu-label">{t("portalMenuList")}</span>
          <span className="portal-menu-desc">{t("portalMenuListDesc").replace("{n}", String(myTickets.length))}</span>
        </button>
      </div>
      {myTickets.length > 0 && (
        <div className="portal-status-summary">
          {(["OPEN","IN_PROGRESS","RESOLVED"] as const).map(s => {
            const n = myTickets.filter(tk => tk.status === s).length;
            if (n === 0) return null;
            const colors: Record<string, string> = { OPEN: "var(--accent)", IN_PROGRESS: "var(--warning)", RESOLVED: "var(--success)" };
            return (
              <div key={s} className="portal-summary-chip" style={{ borderColor: colors[s] + "66", color: colors[s] }}>
                <strong>{n}</strong> {statusLabels[s]}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ═══ CREATE ═══ */
  if (view === "create") return (
    <div className="portal-page">
      <div className="portal-back-row">
        <button className="btn btn-ghost" onClick={() => setView("menu")}>{t("portalBack")}</button>
        <h2 className="portal-section-title">{t("portalCreateHeading")}</h2>
      </div>
      <div className="portal-card">
        <form onSubmit={handleSubmit} className="portal-form">
          <div className="portal-form-grid">
            <label className="form-label">
              {t("portalTitleRequired")} <span className="form-required">*</span>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder={t("portalTitlePlaceholder")} required />
            </label>
            <div className="form-label">
              <span>{t("portalPriority")}</span>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 14px", borderRadius: 20, fontSize: "0.82rem", fontWeight: 600,
                  border: `1.5px solid ${prioMeta[autoPriority].color}`,
                  color: prioMeta[autoPriority].color,
                  background: prioMeta[autoPriority].color + "18",
                }}>
                  {prioMeta[autoPriority].label}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  🤖 {autoPriority === "HIGH" ? "Notfall erkannt" : autoPriority === "LOW" ? "Routine erkannt" : "Wird automatisch ermittelt"}
                </span>
              </div>
            </div>
          </div>
          <label className="form-label">
            {t("portalDescRequired")} <span className="form-required">*</span>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder={t("portalDescPlaceholder")} rows={4} required />
          </label>
          <div className="form-label">
            <span>{t("portalSlotHeading")} <span className="form-optional">({t("portalSlotOptional")})</span></span>
            <p className="portal-hint" style={{ marginBottom: 10 }}>◷ {t("portalSlotHint")}</p>
            <AvailabilitySlots slots={slots} onChange={setSlots} />
          </div>
          <div className="form-label">
            <span>{t("portalPhoto")} <span className="form-optional">({t("portalPhotoOptional")})</span></span>
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
          {submitError && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--danger-bg, #fee)", border: "1px solid var(--danger)", color: "var(--danger)", fontSize: "0.85rem", marginBottom: 4 }}>
              ⚠ {submitError}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting || !title.trim() || !desc.trim()}>
              {submitting ? t("portalSubmittingBtn") : t("portalSubmitBtn")}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setView("menu")}>{t("portalBack").replace("←","").trim()}</button>
          </div>
        </form>
      </div>
    </div>
  );

  /* ═══ CONFIRM ═══ */
  if (view === "confirm" && confirmedTicket) return (
    <div className="portal-page">
      <div className="portal-confirm-card">
        <div className="portal-confirm-icon">✓</div>
        <h2 className="portal-confirm-title">{t("portalConfirmTitle")}</h2>
        <p className="portal-confirm-sub">{t("portalConfirmSub")}</p>
        <div className="portal-confirm-info">
          {[
            [t("portalConfirmTicketNr"), `#${confirmedTicket.id}`],
            ["Titel", confirmedTicket.title],
            [t("portalConfirmStatus"), t("portalStatusAssigned")],
            [t("portalConfirmTech"), confirmedTicket.technicianName ?? t("portalConfirmTechAuto")],
          ].map(([k, v]) => (
            <div key={k} className="portal-confirm-row">
              <span>{k}</span>
              <strong style={{ color: k === t("portalConfirmStatus") ? "var(--success)" : "var(--text-primary)" }}>{v}</strong>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, padding: "12px 16px", borderRadius: 10, background: "var(--success-bg, #0a2a1a)", border: "1px solid var(--success)", color: "var(--success)", fontSize: "0.85rem", textAlign: "center", lineHeight: 1.5 }}>
          {confirmedTicket.firstSlot
            ? <>📅 {formatVisitMessage(confirmedTicket.firstSlot.date, confirmedTicket.firstSlot.time, confirmedTicket.technicianName)}</>
            : <>✓ {confirmedTicket.technicianName ?? "Ihr Techniker"} wurde zugewiesen und wird sich in Kürze bei Ihnen melden.</>}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, width: "100%" }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setView("list")}>{t("portalConfirmShowList")}</button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setView("create")}>{t("portalConfirmNewBtn")}</button>
        </div>
      </div>
    </div>
  );

  /* ═══ LIST ═══ */
  if (view === "list") return (
    <div className="portal-page">
      <div className="portal-back-row">
        <button className="btn btn-ghost" onClick={() => setView("menu")}>{t("portalBack")}</button>
        <h2 className="portal-section-title">{t("portalListHeading")}</h2>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setView("create")}>+ {t("portalMenuNew")}</button>
      </div>
      {myTickets.length === 0 ? (
        <div className="portal-card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12, opacity: 0.4 }}>◎</div>
          <p style={{ color: "var(--text-muted)" }}>{t("portalListEmpty")}</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setView("create")}>{t("portalListEmptyBtn")}</button>
        </div>
      ) : (
        <div className="portal-ticket-list">
          {myTickets.map(ticket => {
            const sla = getSLALabel(ticket, t);
            const prioColors: Record<string, string> = { HIGH: "var(--danger)", MEDIUM: "var(--warning)", LOW: "var(--success)" };
            const prioLabels: Record<string, string> = { HIGH: t("portalPrioHigh"), MEDIUM: t("portalPrioMedium"), LOW: t("portalPrioLow") };
            const pColor = prioColors[ticket.priority] ?? "var(--text-muted)";
            return (
              <button key={ticket.id} className="portal-ticket-item"
                onClick={() => { setDetailTicket(ticket); setView("detail"); }}>
                <div className="portal-ticket-top">
                  <span className="portal-ticket-title">{ticket.title}</span>
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="portal-ticket-meta">
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>#{ticket.id}</span>
                  <span style={{ color: "var(--border)" }}>·</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "1px 6px", borderRadius: 8, background: pColor + "18", color: pColor, border: `1px solid ${pColor}33` }}>
                    {prioLabels[ticket.priority] ?? ticket.priority}
                  </span>
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

  /* ═══ DETAIL ═══ */
  if (view === "detail" && detailTicket) {
    const lines = detailTicket.description?.split("\n") ?? [];
    const imageLineIdx = lines.findIndex(l => l.startsWith("[BILD:"));
    const rawDesc = imageLineIdx >= 0 ? lines.slice(0, imageLineIdx).join("\n") : detailTicket.description;
    const visibleDesc = stripAvailBlock(rawDesc ?? "");
    const imgData = imageLineIdx >= 0 ? lines.slice(imageLineIdx + 1).join("\n") : null;
    const firstSlot = parseFirstSlot(detailTicket.description ?? "");
    const isActive = detailTicket.status === "ASSIGNED" || detailTicket.status === "IN_PROGRESS";
    return (
      <div className="portal-page">
        <div className="portal-back-row">
          <button className="btn btn-ghost" onClick={() => setView("list")}>{t("portalBack")}</button>
          <h2 className="portal-section-title">{t("portalDetailHeading")} #{detailTicket.id}</h2>
        </div>
        <div className="portal-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 4 }}>{detailTicket.title}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{formatDate(detailTicket.created_at)}</div>
            </div>
            <StatusBadge status={detailTicket.status} />
          </div>
          <StatusTimeline status={detailTicket.status} labels={statusLabels} />
          {isActive && (
            <div style={{ margin: "14px 0", padding: "12px 16px", borderRadius: 10, background: "var(--success-bg, #0a2a1a)", border: "1px solid var(--success)", color: "var(--success)", fontSize: "0.85rem", lineHeight: 1.5 }}>
              {firstSlot
                ? <>📅 {formatVisitMessage(firstSlot.date, firstSlot.time)}</>
                : <>✓ Ihr Techniker wurde zugewiesen und wird sich in Kürze bei Ihnen melden.</>}
            </div>
          )}
          {visibleDesc && (
            <div className="portal-detail-section">
              <div className="portal-detail-label">{t("portalDetailDesc")}</div>
              <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap", margin: 0 }}>{visibleDesc}</p>
            </div>
          )}
          {imgData && (
            <div className="portal-detail-section">
              <div className="portal-detail-label">{t("portalDetailPhoto")}</div>
              <img src={imgData} alt="Ticket-Foto" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
            </div>
          )}
          {(detailTicket.status === "OPEN" || detailTicket.status === "ASSIGNED") && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-ghost" style={{ fontSize: "0.85rem" }}
                onClick={() => { setReschedSlots([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }]); setView("reschedule"); }}>
                ◷ {t("portalDetailReschedule")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══ RESCHEDULE ═══ */
  if (view === "reschedule" && detailTicket) return (
    <div className="portal-page">
      <div className="portal-back-row">
        <button className="btn btn-ghost" onClick={() => setView("detail")}>{t("portalBack")}</button>
        <h2 className="portal-section-title">{t("portalRescheduleHeading")}</h2>
      </div>
      <div className="portal-card">
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 16 }}>
          #{detailTicket.id} — <strong>{detailTicket.title}</strong>
        </p>
        <p className="portal-hint" style={{ marginBottom: 12 }}>◷ {t("portalRescheduleSub")}</p>
        <AvailabilitySlots slots={reschedSlots} onChange={setReschedSlots} />
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary" style={{ flex: 1 }}
            onClick={() => { alert(t("portalConfirmHint")); setView("detail"); }}>
            ✓ {t("portalRescheduleBtn")}
          </button>
          <button className="btn btn-ghost" onClick={() => setView("detail")}>{t("portalBack").replace("←","").trim()}</button>
        </div>
      </div>
    </div>
  );

  return null;
}
