import { useState } from "react";
import { createTicket } from "../api";
import { useLanguage } from "../i18n/LanguageContext";
import type { Ticket, Unit } from "../types";
import { StatusBadge } from "./StatusBadge";

const SLA_HOURS: Record<string, number> = { HIGH: 4, MEDIUM: 24, LOW: 72 };

function getSLALabel(ticket: Ticket): { label: string; cls: string } | null {
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") return null;
  const slaH = SLA_HOURS[ticket.priority] ?? 24;
  const elapsed = (Date.now() - new Date(ticket.created_at).getTime()) / 3600000;
  if (elapsed > slaH) return { label: "🔴 Überfällig", cls: "sla-exceeded" };
  if (elapsed > slaH * 0.8) return { label: "🟡 At Risk", cls: "sla-risk" };
  return null;
}

function formatPortalDate(iso: string): string {
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

interface Props {
  units: Unit[];
  tickets: Ticket[];
  onTicketCreated: () => void;
  onShowTicket: (ticket: Ticket) => void;
}

export function TenantPortal({ units, tickets, onTicketCreated, onShowTicket }: Props) {
  const { t } = useLanguage();
  const [selectedUnit, setSelectedUnit] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const myTickets = selectedUnit > 0
    ? tickets.filter(t => t.unit_id === selectedUnit).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit || !title.trim() || !desc.trim()) return;
    setSubmitting(true);
    try {
      await createTicket({ title: title.trim(), description: desc.trim(), unit_id: selectedUnit });
      setTitle(""); setDesc("");
      setSuccessMsg(t("portalSuccess"));
      onTicketCreated();
      setTimeout(() => { setSuccessMsg(""); setActiveTab("list"); }, 1800);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="portal-page">
      {/* Header */}
      <div className="portal-header">
        <div className="portal-header-icon">🏠</div>
        <div>
          <h2 className="portal-title">{t("portalTitle")}</h2>
          <p className="portal-subtitle">{t("portalSubtitle")}</p>
        </div>
      </div>

      {/* Unit selector */}
      <div className="portal-unit-selector">
        <label className="form-label">
          {t("portalSelectUnit")}
          <select
            value={selectedUnit}
            onChange={e => setSelectedUnit(Number(e.target.value))}
            className="portal-unit-select"
          >
            <option value={0}>— Einheit auswählen —</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.floor}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Tabs */}
      <div className="portal-tabs">
        <button className={`portal-tab ${activeTab === "create" ? "active" : ""}`} onClick={() => setActiveTab("create")}>
          ＋ {t("portalCreateTitle")}
        </button>
        <button className={`portal-tab ${activeTab === "list" ? "active" : ""}`} onClick={() => setActiveTab("list")}>
          📋 {t("portalMyTickets")} {selectedUnit > 0 && myTickets.length > 0 && `(${myTickets.length})`}
        </button>
      </div>

      {/* Create form */}
      {activeTab === "create" && (
        <div className="portal-card">
          {successMsg && <div className="portal-success">{successMsg}</div>}
          <form onSubmit={handleSubmit} className="portal-form">
            <label className="form-label">
              {t("portalTitleLabel")}
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t("portalTitlePlaceholder")}
                required
                disabled={!selectedUnit}
              />
            </label>
            <label className="form-label">
              {t("portalDescLabel")}
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder={selectedUnit ? t("portalDescPlaceholder") : t("portalSelectFirst")}
                rows={4}
                required
                disabled={!selectedUnit}
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={submitting || !selectedUnit || !title.trim() || !desc.trim()}
            >
              {submitting ? t("portalSubmitting") : t("portalSubmit")}
            </button>
          </form>
          <p className="portal-hint">
            💡 Ihr Ticket wird automatisch an den passenden Techniker weitergeleitet.
          </p>
        </div>
      )}

      {/* My tickets */}
      {activeTab === "list" && (
        <div className="portal-card">
          {!selectedUnit ? (
            <p className="portal-empty">{t("portalSelectFirst")}</p>
          ) : myTickets.length === 0 ? (
            <p className="portal-empty">{t("portalNoTickets")}</p>
          ) : (
            <div className="portal-ticket-list">
              {myTickets.map(ticket => {
                const sla = getSLALabel(ticket);
                return (
                  <button key={ticket.id} className="portal-ticket-item" onClick={() => onShowTicket(ticket)}>
                    <div className="portal-ticket-top">
                      <span className="portal-ticket-title">{ticket.title}</span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <div className="portal-ticket-meta">
                      <span>#{ticket.id}</span>
                      <span>·</span>
                      <span>{formatPortalDate(ticket.created_at)}</span>
                      {sla && <span className={`sla-badge-small ${sla.cls}`}>{sla.label}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
