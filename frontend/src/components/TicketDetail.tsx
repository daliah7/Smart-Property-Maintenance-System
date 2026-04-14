import { useEffect, useState } from "react";
import { fetchTicketHistory } from "../api";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import type { Invoice, Technician, Ticket, TicketHistory, TicketPriority } from "../types";
import { StatusBadge } from "./StatusBadge";

const SLA_HOURS: Record<string, number> = { HIGH: 4, MEDIUM: 24, LOW: 72 };

interface Props {
  ticket?: Ticket;
  technicians: Technician[];
  onAssign: (ticketId: number, technicianId: number) => void;
  onAutoAssign: (ticketId: number) => void;
  onStart: (ticketId: number) => void;
  onResolve: (ticketId: number) => void;
  onClose: (ticketId: number) => void;
  onCreateInvoice: (ticketId: number, amount: number) => void;
  onPayInvoice: (invoiceId: number) => void;
  invoice?: Invoice;
}

/* ── Lifecycle Stepper ── */
const LIFECYCLE_STEPS: { key: string; labelKey: TranslationKey }[] = [
  { key: "OPEN",        labelKey: "statusOpen"        },
  { key: "ASSIGNED",    labelKey: "statusAssigned"    },
  { key: "IN_PROGRESS", labelKey: "statusInProgress"  },
  { key: "RESOLVED",    labelKey: "statusResolved"    },
  { key: "CLOSED",      labelKey: "statusClosed"      },
];
const STEP_ORDER = LIFECYCLE_STEPS.map(s => s.key);

function LifecycleStepper({ status }: { status: string }) {
  const { t } = useLanguage();
  const activeIndex = STEP_ORDER.indexOf(status);
  return (
    <div className="lifecycle-stepper">
      {LIFECYCLE_STEPS.map((step, i) => {
        const isDone = i < activeIndex, isActive = i === activeIndex;
        return (
          <div key={step.key} className={`step ${isDone ? "step-done" : ""} ${isActive ? "step-active" : ""}`}>
            <div className="step-dot">{isDone ? "✓" : ""}</div>
            <div className="step-label">{t(step.labelKey)}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Priority Badge ── */
type PriorityConfig = { labelKey: TranslationKey; icon: string; className: string };
const PRIORITY_CONFIG: Record<TicketPriority, PriorityConfig> = {
  HIGH:   { labelKey: "priorityHigh",   icon: "▲", className: "priority-high"   },
  MEDIUM: { labelKey: "priorityMedium", icon: "●", className: "priority-medium" },
  LOW:    { labelKey: "priorityLow",    icon: "▼", className: "priority-low"    },
};

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const { t } = useLanguage();
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.MEDIUM;
  return <span className={`priority-badge ${cfg.className}`}>{cfg.icon} {t(cfg.labelKey)}</span>;
}

/* ── SLA Countdown ── */
function SLABadge({ ticket }: { ticket: Ticket }) {
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") return null;
  const slaH = SLA_HOURS[ticket.priority] ?? 24;
  const elapsed = (Date.now() - new Date(ticket.created_at).getTime()) / 3600000;
  const rem = slaH - elapsed;
  if (rem < 0) {
    const over = Math.abs(rem);
    return (
      <div className="sla-countdown sla-countdown-exceeded">
        <span className="sla-icon">🚨</span>
        <span>SLA {over.toFixed(0)}h überschritten</span>
      </div>
    );
  }
  if (rem < slaH * 0.2) {
    return (
      <div className="sla-countdown sla-countdown-risk">
        <span className="sla-icon">⚠️</span>
        <span>At Risk · {rem.toFixed(1)}h verbleibend</span>
      </div>
    );
  }
  return (
    <div className="sla-countdown sla-countdown-ok">
      <span className="sla-icon">✅</span>
      <span>SLA · {rem.toFixed(1)}h verbleibend</span>
    </div>
  );
}

/* ── Timeline ── */
const EVENT_ICONS: Record<string, string> = {
  CREATED: "📝", ASSIGNED: "👷", STARTED: "▶", RESOLVED: "✓", CLOSED: "⊘", ESCALATED: "🚨",
};

function Timeline({ ticketId }: { ticketId: number }) {
  const { t } = useLanguage();
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicketHistory(ticketId)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [ticketId]);

  if (loading) return <div className="timeline-loading"><div className="spinner-sm" /></div>;
  if (history.length === 0) return <p className="timeline-empty">{t("timelineEmpty")}</p>;

  return (
    <div className="timeline">
      {history.map((entry, i) => {
        const isLast = i === history.length - 1;
        const eventKey = `event${entry.event}` as TranslationKey;
        const label = t(eventKey) ?? entry.event;
        const dt = new Date(entry.created_at);
        const formatted = new Intl.DateTimeFormat("de-CH", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        }).format(dt);
        return (
          <div key={entry.id} className={`timeline-item ${isLast ? "timeline-item-last" : ""}`}>
            <div className="timeline-dot">
              <span className="timeline-dot-icon">{EVENT_ICONS[entry.event] ?? "•"}</span>
              {!isLast && <div className="timeline-line" />}
            </div>
            <div className="timeline-content">
              <span className="timeline-event">{label}</span>
              {entry.note && <span className="timeline-note">{entry.note}</span>}
              <span className="timeline-time">{formatted}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Date Formatter ── */
function formatDate(iso: string, lang: string) {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

/* ── Main Component ── */
export function TicketDetail({ ticket, technicians, onAssign, onAutoAssign, onStart, onResolve, onClose, onCreateInvoice, onPayInvoice, invoice }: Props) {
  const { t, lang } = useLanguage();
  const [technicianId, setTechnicianId] = useState<number>(technicians?.[0]?.id ?? 0);
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [activeTab, setActiveTab] = useState<"detail" | "history">("detail");

  // Reset tab when ticket changes
  useEffect(() => { setActiveTab("detail"); }, [ticket?.id]);

  if (!ticket) {
    return (
      <section className="panel">
        <div className="empty-state">
          <div className="empty-state-icon">{t("detailEmptyIcon")}</div>
          <div className="empty-state-text" style={{ whiteSpace: "pre-line" }}>{t("detailEmpty")}</div>
        </div>
      </section>
    );
  }

  const assignedTechnician = technicians.find(tech => tech.id === ticket.technician_id);

  return (
    <section className="panel" key={ticket.id}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <h2 className="detail-title">{ticket.title}</h2>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>

      {/* SLA Countdown */}
      <SLABadge ticket={ticket} />

      {/* Stepper */}
      <LifecycleStepper status={ticket.status} />

      {/* Tabs */}
      <div className="detail-tabs">
        <button className={`detail-tab-btn ${activeTab === "detail" ? "active" : ""}`} onClick={() => setActiveTab("detail")}>
          {t("detailTab")}
        </button>
        <button className={`detail-tab-btn ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          {t("timelineTab")}
        </button>
      </div>

      {activeTab === "history" && (
        <div className="timeline-container">
          <Timeline ticketId={ticket.id} />
        </div>
      )}

      {activeTab === "detail" && (
        <>
          {/* Description */}
          <p className="detail-description">{ticket.description}</p>

          {/* Meta Grid */}
          <div className="meta-grid">
            <div className="meta-item">
              <div className="meta-item-label">{t("metaUnit")}</div>
              <div className="meta-item-value">ID {ticket.unit_id}</div>
            </div>
            <div className="meta-item">
              <div className="meta-item-label">{t("metaTenant")}</div>
              <div className="meta-item-value">{ticket.tenant_id ? `ID ${ticket.tenant_id}` : t("metaNone")}</div>
            </div>
            <div className="meta-item">
              <div className="meta-item-label">{t("metaTechnician")}</div>
              <div className="meta-item-value">
                {assignedTechnician ? assignedTechnician.name : ticket.technician_id ? `ID ${ticket.technician_id}` : t("metaNone")}
              </div>
            </div>
            <div className="meta-item">
              <div className="meta-item-label">{t("metaTicketId")}</div>
              <div className="meta-item-value">#{ticket.id}</div>
            </div>
            <div className="meta-item" style={{ gridColumn: "1 / -1" }}>
              <div className="meta-item-label">{t("metaCreated")}</div>
              <div className="meta-item-value" style={{ fontSize: "0.82rem" }}>{formatDate(ticket.created_at, lang)}</div>
            </div>
          </div>

          <div className="divider" />

          {/* Actions */}
          <div>
            <p className="actions-title">{t("nextAction")}</p>
            <div className="action-stack">
              {ticket.status === "OPEN" && (
                <div className="assign-group">
                  <button className="btn btn-primary btn-full" onClick={() => onAutoAssign(ticket.id)}
                    disabled={technicians.length === 0} title={t("autoAssignHint")}>
                    {t("btnAutoAssign")}
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: "0.78rem" }}>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    {t("orManual")}
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  </div>
                  <label className="form-label">
                    {t("selectTechnician")}
                    <select value={technicianId} onChange={e => setTechnicianId(Number(e.target.value))}>
                      {technicians.map(tech => (
                        <option key={tech.id} value={tech.id}>{tech.name} · {tech.expertise}</option>
                      ))}
                    </select>
                  </label>
                  <button className="btn btn-secondary btn-full" onClick={() => onAssign(ticket.id, technicianId)}
                    disabled={!technicianId}>{t("btnManualAssign")}</button>
                </div>
              )}
              {ticket.status === "ASSIGNED" && (
                <button className="btn btn-warning btn-full" onClick={() => onStart(ticket.id)}>{t("btnStartWork")}</button>
              )}
              {ticket.status === "IN_PROGRESS" && (
                <button className="btn btn-success btn-full" onClick={() => onResolve(ticket.id)}>{t("btnMarkResolved")}</button>
              )}
              {ticket.status === "RESOLVED" && !invoice && (
                <>
                  <button className="btn btn-secondary btn-full" onClick={() => onClose(ticket.id)}>{t("btnCloseNoInvoice")}</button>
                  <div className="invoice-create">
                    <div className="invoice-create-label">{t("invoiceSection")}</div>
                    <label className="form-label">
                      {t("fieldAmount")}
                      <input type="number" value={invoiceAmount || ""} min={0} step={10}
                        placeholder={t("fieldAmountPlaceholder")}
                        onChange={e => setInvoiceAmount(Number(e.target.value))} />
                    </label>
                    <button className="btn btn-primary btn-full"
                      onClick={() => onCreateInvoice(ticket.id, invoiceAmount)}
                      disabled={invoiceAmount <= 0}>{t("btnCreateInvoice")}</button>
                  </div>
                </>
              )}
              {ticket.status === "RESOLVED" && invoice && (
                <button className="btn btn-secondary btn-full" onClick={() => onClose(ticket.id)}>{t("btnClose")}</button>
              )}
              {ticket.status === "CLOSED" && !invoice && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: 0 }}>{t("noMoreActions")}</p>
              )}
            </div>
          </div>

          {/* Invoice Panel */}
          {invoice && (
            <div className="invoice-panel">
              <div className="invoice-header">
                <span className="invoice-label">{t("invoiceTitle")}</span>
                {invoice.paid
                  ? <span className="invoice-status-paid">{t("invoiceStatusPaid")}</span>
                  : <span className="chip">{t("invoiceStatusOpen")}</span>}
              </div>
              <div className="invoice-amount">CHF {Number(invoice.amount).toFixed(2)}</div>
              {invoice.paid_at && (
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "8px 0 0" }}>
                  {t("invoicePaidAt")} {formatDate(invoice.paid_at, lang)}
                </p>
              )}
              {!invoice.paid && (
                <button className="btn btn-success btn-full" style={{ marginTop: 14 }} onClick={() => onPayInvoice(invoice.id)}>
                  {t("btnPayInvoice")}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
