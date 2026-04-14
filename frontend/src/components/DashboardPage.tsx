import { useLanguage } from "../i18n/LanguageContext";
import type { Ticket, Technician } from "../types";
import { StatusBadge } from "./StatusBadge";

const SLA_HOURS: Record<string, number> = { HIGH: 4, MEDIUM: 24, LOW: 72 };

interface Props {
  tickets: Ticket[];
  technicians: Technician[];
  onNavigateTickets: (filter: string) => void;
  onNavigateAnalytics?: () => void;
}

function formatDate(iso: string, lang: string) {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function getSLAHoursRemaining(ticket: Ticket): number {
  const slaH = SLA_HOURS[ticket.priority] ?? 24;
  const elapsed = (Date.now() - new Date(ticket.created_at).getTime()) / 3600000;
  return slaH - elapsed;
}

export function DashboardPage({ tickets, technicians, onNavigateTickets, onNavigateAnalytics }: Props) {
  const { t, tf, lang } = useLanguage();

  /* ── Stats ── */
  const total    = tickets.length;
  const open     = tickets.filter(tk => tk.status === "OPEN").length;
  const active   = tickets.filter(tk => tk.status === "IN_PROGRESS" || tk.status === "ASSIGNED").length;
  const resolved = tickets.filter(tk => tk.status === "RESOLVED" || tk.status === "CLOSED").length;

  /* ── SLA ── */
  const escalatedTickets = tickets.filter(tk => {
    if (tk.status === "RESOLVED" || tk.status === "CLOSED") return false;
    return getSLAHoursRemaining(tk) < 0;
  }).sort((a, b) => getSLAHoursRemaining(a) - getSLAHoursRemaining(b));

  const atRiskTickets = tickets.filter(tk => {
    if (tk.status === "RESOLVED" || tk.status === "CLOSED") return false;
    const rem = getSLAHoursRemaining(tk);
    return rem >= 0 && rem < (SLA_HOURS[tk.priority] ?? 24) * 0.2;
  });

  const statCards = [
    { label: t("statsTotal"),  value: total,    cls: "stat-total",  filter: "" },
    { label: t("statsOpen"),   value: open,      cls: "stat-open",   filter: "OPEN" },
    { label: t("statsActive"), value: active,    cls: "stat-active", filter: "ASSIGNED" },
    { label: t("statsDone"),   value: resolved,  cls: "stat-done",   filter: "RESOLVED" },
  ];

  /* ── Priority ── */
  const high   = tickets.filter(tk => tk.priority === "HIGH").length;
  const medium = tickets.filter(tk => tk.priority === "MEDIUM").length;
  const low    = tickets.filter(tk => tk.priority === "LOW").length;
  const maxPrio = Math.max(high, medium, low, 1);

  /* ── Workload ── */
  const workload = technicians.map(tech => ({
    tech,
    open:   tickets.filter(tk => tk.technician_id === tech.id && tk.status === "OPEN").length,
    active: tickets.filter(tk => tk.technician_id === tech.id && (tk.status === "ASSIGNED" || tk.status === "IN_PROGRESS")).length,
    done:   tickets.filter(tk => tk.technician_id === tech.id && (tk.status === "RESOLVED" || tk.status === "CLOSED")).length,
    total:  tickets.filter(tk => tk.technician_id === tech.id).length,
  }));

  /* ── Recent ── */
  const recent = [...tickets]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div className="dashboard-grid">
      {/* Stat cards */}
      <div className="dash-stats-row">
        {statCards.map(card => (
          <button
            key={card.cls}
            className={`stat-card ${card.cls} stat-clickable`}
            onClick={() => onNavigateTickets(card.filter)}
            title={t("dashClickHint")}
          >
            <div className="stat-card-value">{card.value}</div>
            <div className="stat-card-label">{card.label}</div>
            <div className="stat-card-hint">{t("dashClickHint")}</div>
          </button>
        ))}
      </div>

      {/* SLA Alert Section */}
      {(escalatedTickets.length > 0 || atRiskTickets.length > 0) && (
        <div className="sla-alert-section">
          <div className="sla-alert-header">
            <h3 className="panel-title" style={{ margin: 0 }}>🚨 {t("dashSLATitle")}</h3>
            {onNavigateAnalytics && (
              <button className="btn-link" onClick={onNavigateAnalytics}>→ Analytics</button>
            )}
          </div>
          <div className="sla-alert-cards">
            {escalatedTickets.slice(0, 3).map(tk => {
              const over = Math.abs(getSLAHoursRemaining(tk));
              return (
                <button key={tk.id} className="sla-alert-card sla-escalated"
                  onClick={() => onNavigateTickets("")}>
                  <span className="sla-badge-label">🔴 Eskaliert</span>
                  <span className="sla-ticket-title">{tk.title}</span>
                  <span className="sla-ticket-meta">#{tk.id} · {over.toFixed(0)}h überfällig</span>
                </button>
              );
            })}
            {atRiskTickets.slice(0, 2).map(tk => {
              const rem = getSLAHoursRemaining(tk);
              return (
                <button key={tk.id} className="sla-alert-card sla-at-risk"
                  onClick={() => onNavigateTickets("")}>
                  <span className="sla-badge-label">🟡 At Risk</span>
                  <span className="sla-ticket-title">{tk.title}</span>
                  <span className="sla-ticket-meta">#{tk.id} · {rem.toFixed(1)}h verbleibend</span>
                </button>
              );
            })}
          </div>
          <div className="sla-summary">
            <span className="sla-count-badge sla-count-exc">{escalatedTickets.length} eskaliert</span>
            <span className="sla-count-badge sla-count-risk">{atRiskTickets.length} at risk</span>
          </div>
        </div>
      )}

      {escalatedTickets.length === 0 && atRiskTickets.length === 0 && (
        <div className="sla-ok-banner">✅ {t("dashNoEscalated")}</div>
      )}

      <div className="dashboard-row">
        {/* Priority Distribution */}
        <div className="panel">
          <h3 className="panel-title" style={{ marginBottom: 18 }}>{t("dashPriorityTitle")}</h3>
          <div className="priority-dist">
            {[
              { label: "HIGH",   count: high,   color: "var(--danger)",  icon: "▲" },
              { label: "MEDIUM", count: medium, color: "var(--warning)", icon: "●" },
              { label: "LOW",    count: low,    color: "var(--success)", icon: "▼" },
            ].map(row => (
              <div key={row.label} className="priority-dist-row">
                <span className="priority-dist-label" style={{ color: row.color }}>{row.icon} {row.label}</span>
                <div className="priority-dist-bar-track">
                  <div className="priority-dist-bar-fill"
                    style={{ width: `${(row.count / maxPrio) * 100}%`, background: row.color }} />
                </div>
                <span className="priority-dist-count">{row.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="panel">
          <h3 className="panel-title" style={{ marginBottom: 18 }}>{t("dashRecentTitle")}</h3>
          {recent.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>{t("dashNoTickets")}</p>
          ) : (
            <div className="recent-list">
              {recent.map(ticket => (
                <div key={ticket.id} className="recent-item">
                  <div className="recent-item-left">
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>#{ticket.id}</span>
                    <span className="recent-item-title">{ticket.title}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {formatDate(ticket.created_at, lang)}
                    </span>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Technician Workload */}
      <div className="panel">
        <h3 className="panel-title" style={{ marginBottom: 18 }}>{t("dashWorkloadTitle")}</h3>
        <div className="workload-table-wrap">
          <table className="workload-table">
            <thead>
              <tr>
                <th>{t("dashColName")}</th>
                <th>{t("dashColExpertise")}</th>
                <th>{t("dashColOpen")}</th>
                <th>{t("dashColActive")}</th>
                <th>{t("dashColDone")}</th>
                <th>{t("dashColTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {workload.map(({ tech, open, active, done, total }) => (
                <tr key={tech.id}>
                  <td className="workload-name">{tech.name}</td>
                  <td>
                    <div className="expertise-chips">
                      {tech.expertise.split(" ").slice(0, 3).map(kw => (
                        <span key={kw} className="expertise-chip">{kw}</span>
                      ))}
                    </div>
                  </td>
                  <td><span className={open > 0 ? "workload-num-open" : "workload-num-zero"}>{open}</span></td>
                  <td><span className={active > 0 ? "workload-num-active" : "workload-num-zero"}>{active}</span></td>
                  <td><span className="workload-num-done">{done}</span></td>
                  <td><span className="workload-num-total">{total}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
