import { useLanguage } from "../i18n/LanguageContext";
import type { Technician, Ticket } from "../types";

interface Props {
  technicians: Technician[];
  tickets: Ticket[];
}

export function TechniciansPage({ technicians, tickets }: Props) {
  const { t } = useLanguage();

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">{t("techPageTitle")}</h2>
        <p className="page-sub">{t("techPageSub")}</p>
      </div>

      <div className="tech-grid">
        {technicians.map(tech => {
          const open   = tickets.filter(tk => tk.technician_id === tech.id && tk.status === "OPEN").length;
          const active = tickets.filter(tk => tk.technician_id === tech.id && (tk.status === "ASSIGNED" || tk.status === "IN_PROGRESS")).length;
          const done   = tickets.filter(tk => tk.technician_id === tech.id && (tk.status === "RESOLVED" || tk.status === "CLOSED")).length;
          const total  = open + active + done;

          return (
            <div key={tech.id} className="tech-card panel">
              <div className="tech-card-avatar">
                {tech.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="tech-card-name">{tech.name}</div>
              <div className="expertise-chips" style={{ justifyContent: "center", marginBottom: 16 }}>
                {tech.expertise.split(" ").map(kw => (
                  <span key={kw} className="expertise-chip">{kw}</span>
                ))}
              </div>
              <div className="tech-card-stats">
                <div className="tech-stat">
                  <span className="tech-stat-value" style={{ color: "var(--accent)" }}>{open}</span>
                  <span className="tech-stat-label">{t("techOpenTickets")}</span>
                </div>
                <div className="tech-stat">
                  <span className="tech-stat-value" style={{ color: "var(--warning)" }}>{active}</span>
                  <span className="tech-stat-label">{t("techActiveTickets")}</span>
                </div>
                <div className="tech-stat">
                  <span className="tech-stat-value" style={{ color: "var(--success)" }}>{done}</span>
                  <span className="tech-stat-label">{t("techDoneTickets")}</span>
                </div>
              </div>
              <div className="tech-card-bar">
                <div
                  className="tech-card-bar-fill"
                  style={{ width: total > 0 ? `${Math.min((active / total) * 100, 100)}%` : "0%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
