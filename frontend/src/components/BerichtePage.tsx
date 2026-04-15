import { useState } from "react";
import type { Ticket, Technician, Property } from "../types";

const MONTH_NAMES = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

interface Props { tickets: Ticket[]; technicians: Technician[]; properties: Property[]; }

export function BerichtePage({ tickets, technicians, properties }: Props) {
  const now        = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [type,     setType]     = useState<"monthly"|"property"|"technician">("monthly");

  const monthKey = `${selYear}-${String(selMonth + 1).padStart(2, "0")}`;
  const monthTickets = tickets.filter(t => t.created_at.startsWith(monthKey));
  const resolved = monthTickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED");
  const open     = monthTickets.filter(t => t.status === "OPEN");
  const high     = monthTickets.filter(t => t.priority === "HIGH");

  // Technician stats for the month
  const techStats = technicians.map(tech => {
    const assigned = monthTickets.filter(t => t.technician_id === tech.id);
    const done     = assigned.filter(t => t.status === "RESOLVED" || t.status === "CLOSED");
    return { tech, assigned: assigned.length, done: done.length, rate: assigned.length > 0 ? Math.round((done.length / assigned.length) * 100) : 0 };
  }).filter(s => s.assigned > 0).sort((a, b) => b.assigned - a.assigned);

  // Property stats
  const propStats = properties.map(prop => {
    const pts = monthTickets.filter(t => String(t.unit_id).startsWith(String(prop.id)));
    return { prop, count: pts.length, open: pts.filter(t => t.status === "OPEN").length };
  }).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

  const print = () => window.print();

  const years = [now.getFullYear() - 1, now.getFullYear()];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">▦ Berichte</h2>
          <p className="page-subtitle">Monats- und Jahresberichte, Techniker-Performance, Objekt-Auswertung</p>
        </div>
        <button className="btn btn-primary" onClick={print}>⎙ Drucken / Export</button>
      </div>

      {/* Report type + period */}
      <div className="panel bericht-controls">
        <div className="bericht-type-row">
          {([["monthly","◷ Monatsbericht"],["property","▣ Objektbericht"],["technician","◉ Technikerbericht"]] as const).map(([val, label]) => (
            <button key={val} className={`bericht-type-btn ${type === val ? "active" : ""}`} onClick={() => setType(val)}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label className="form-label" style={{ marginBottom: 0, flexDirection: "row", alignItems: "center", gap: 8 }}>
            Monat:
            <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))} style={{ width: "auto" }}>
              {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </label>
          <label className="form-label" style={{ marginBottom: 0, flexDirection: "row", alignItems: "center", gap: 8 }}>
            Jahr:
            <select value={selYear} onChange={e => setSelYear(Number(e.target.value))} style={{ width: "auto" }}>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Report content */}
      <div className="bericht-content" id="print-area">
        <div className="bericht-report-header">
          <div>
            <h3 className="bericht-report-title">
              {type === "monthly" && `Monatsbericht ${MONTH_NAMES[selMonth]} ${selYear}`}
              {type === "property" && `Objektbericht ${MONTH_NAMES[selMonth]} ${selYear}`}
              {type === "technician" && `Technikerbericht ${MONTH_NAMES[selMonth]} ${selYear}`}
            </h3>
            <p className="bericht-report-sub">Smart Property Maintenance System · Erstellt am {now.toLocaleDateString("de-CH")}</p>
          </div>
        </div>

        {type === "monthly" && (
          <>
            {/* Summary KPIs */}
            <div className="bericht-kpi-row">
              {[
                ["Tickets total", monthTickets.length, ""],
                ["Gelöst / Geschlossen", resolved.length, "var(--success)"],
                ["Noch offen", open.length, open.length > 0 ? "var(--warning)" : ""],
                ["Hohe Priorität", high.length, high.length > 0 ? "var(--danger)" : ""],
                ["Lösungsrate", monthTickets.length > 0 ? `${Math.round((resolved.length / monthTickets.length) * 100)}%` : "—", "var(--accent)"],
              ].map(([label, val, color]) => (
                <div key={label as string} className="bericht-kpi-card">
                  <span className="bericht-kpi-val" style={{ color: (color as string) || "var(--text-primary)" }}>{val}</span>
                  <span className="bericht-kpi-label">{label}</span>
                </div>
              ))}
            </div>

            {/* Ticket list */}
            <div className="panel" style={{ marginTop: 16 }}>
              <h4 className="panel-title" style={{ marginBottom: 12 }}>Alle Tickets im {MONTH_NAMES[selMonth]}</h4>
              {monthTickets.length === 0
                ? <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Keine Tickets in diesem Zeitraum.</p>
                : <table className="workload-table">
                    <thead><tr><th>#</th><th>Titel</th><th>Priorität</th><th>Status</th><th>Erstellt</th></tr></thead>
                    <tbody>
                      {monthTickets.map(t => (
                        <tr key={t.id}>
                          <td style={{ color: "var(--text-muted)" }}>#{t.id}</td>
                          <td>{t.title}</td>
                          <td><span style={{ color: t.priority === "HIGH" ? "var(--danger)" : t.priority === "MEDIUM" ? "var(--warning)" : "var(--success)", fontWeight: 600, fontSize: "0.78rem" }}>{t.priority}</span></td>
                          <td>{t.status}</td>
                          <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{t.created_at.slice(0, 10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
          </>
        )}

        {type === "technician" && (
          <div className="panel" style={{ marginTop: 16 }}>
            <h4 className="panel-title" style={{ marginBottom: 12 }}>Techniker-Performance {MONTH_NAMES[selMonth]}</h4>
            {techStats.length === 0
              ? <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Keine Daten für diesen Zeitraum.</p>
              : <div className="bericht-tech-list">
                  {techStats.map(({ tech, assigned, done, rate }) => (
                    <div key={tech.id} className="bericht-tech-row">
                      <div className="bericht-tech-name">
                        <span className="bericht-tech-avatar">◉</span>
                        <div><div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{tech.name}</div><div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{tech.expertise}</div></div>
                      </div>
                      <div className="bericht-tech-stats">
                        <div className="bericht-tech-stat"><span>{assigned}</span><span>Zugewiesen</span></div>
                        <div className="bericht-tech-stat"><span style={{ color: "var(--success)" }}>{done}</span><span>Erledigt</span></div>
                        <div className="bericht-tech-stat"><span style={{ color: rate >= 80 ? "var(--success)" : rate >= 50 ? "var(--warning)" : "var(--danger)" }}>{rate}%</span><span>Rate</span></div>
                      </div>
                      <div className="bericht-tech-bar-wrap">
                        <div className="bericht-tech-bar" style={{ width: `${rate}%`, background: rate >= 80 ? "var(--success)" : rate >= 50 ? "var(--warning)" : "var(--danger)" }} />
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {type === "property" && (
          <div className="panel" style={{ marginTop: 16 }}>
            <h4 className="panel-title" style={{ marginBottom: 12 }}>Tickets nach Objekt – {MONTH_NAMES[selMonth]}</h4>
            {properties.length === 0
              ? <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Keine Objekte.</p>
              : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {properties.map(prop => {
                    const stat = propStats.find(s => s.prop.id === prop.id) ?? { count: 0, open: 0 };
                    return (
                      <div key={prop.id} className="bericht-prop-row">
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{prop.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{prop.address}</div>
                        </div>
                        <div style={{ display: "flex", gap: 20, fontSize: "0.88rem" }}>
                          <span><strong>{stat.count}</strong> Tickets</span>
                          <span style={{ color: stat.open > 0 ? "var(--warning)" : "var(--text-muted)" }}><strong>{stat.open}</strong> offen</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}
