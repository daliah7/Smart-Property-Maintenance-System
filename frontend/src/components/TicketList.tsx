import { useLanguage } from "../i18n/LanguageContext";
import type { Ticket, TicketPriority } from "../types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  tickets: Ticket[];
  selectedTicketId?: number;
  onSelectTicket: (ticket: Ticket) => void;
  onFilterChange: (status: string) => void;
  filter: string;
  loading?: boolean;
}

const PRIORITY_DOT: Record<TicketPriority, string> = {
  HIGH:   "🔴",
  MEDIUM: "🟡",
  LOW:    "🟢",
};

export function TicketList({
  tickets,
  selectedTicketId,
  onSelectTicket,
  onFilterChange,
  filter,
  loading = false,
}: Props) {
  const { t, tf } = useLanguage();

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)  return t("timeJustNow");
    if (mins < 60) return tf("timeMinutes", { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return tf("timeHours", { n: hrs });
    const days = Math.floor(hrs / 24);
    return days === 1 ? tf("timeDaysSingle", { n: days }) : tf("timeDaysPlural", { n: days });
  }

  const filterOptions = [
    { value: "",            label: t("filterAll") },
    { value: "OPEN",        label: t("filterOpen") },
    { value: "ASSIGNED",    label: t("filterAssigned") },
    { value: "IN_PROGRESS", label: t("filterInProgress") },
    { value: "RESOLVED",    label: t("filterResolved") },
    { value: "CLOSED",      label: t("filterClosed") },
  ];

  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">
          {t("listTitle")}{" "}
          <span className="ticket-count">{tickets.length > 0 ? `(${tickets.length})` : ""}</span>
        </h2>
        <select
          className="filter-select"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          aria-label={t("filterAll")}
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="ticket-list-grid">
          {[1, 2, 3].map((n) => <div key={n} className="skeleton skeleton-row" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{t("emptyIcon")}</div>
          <div className="empty-state-text">
            {filter
              ? tf("emptyFiltered", { status: filter })
              : t("emptyAll")}
          </div>
        </div>
      ) : (
        <div className="ticket-list-grid">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              className={`ticket-item ${selectedTicketId === ticket.id ? "selected" : ""}`}
              onClick={() => onSelectTicket(ticket)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ticket-item-title">
                  <span title={ticket.priority} style={{ marginRight: 6 }}>
                    {PRIORITY_DOT[ticket.priority] ?? "🟡"}
                  </span>
                  {ticket.title}
                </div>
                <div className="ticket-item-meta">
                  <span>{t("metaUnit")} {ticket.unit_id}</span>
                  <span>·</span>
                  <span>{timeAgo(ticket.created_at)}</span>
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <StatusBadge status={ticket.status} />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
