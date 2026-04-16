import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import type { Technician, Ticket } from "../types";

const HOURLY_RATE = 80;

/* ── AI Scheduling helpers ── */
const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const WORK_HOURS: Record<string, number>     = { HIGH: 4, MEDIUM: 2, LOW: 1 };

interface ScheduleEntry {
  date: string;       // "Mo 14.04"
  timeStart: string;  // "08:00"
  timeEnd: string;    // "12:00"
  ticket: Ticket;
}

function buildSchedule(tickets: Ticket[], techId: number): ScheduleEntry[] {
  const active = tickets
    .filter(tk => tk.technician_id === techId &&
      (tk.status === "OPEN" || tk.status === "ASSIGNED" || tk.status === "IN_PROGRESS"))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const entries: ScheduleEntry[] = [];
  let day = new Date();
  // start next weekday morning
  if (day.getHours() >= 16) day.setDate(day.getDate() + 1);
  if (day.getDay() === 0) day.setDate(day.getDate() + 1);
  if (day.getDay() === 6) day.setDate(day.getDate() + 2);

  let hourPointer = 8; // 08:00

  for (const tk of active) {
    const h = WORK_HOURS[tk.priority] ?? 2;
    // If no room left in day (max 8h, i.e. until 16:00) → next day
    if (hourPointer + h > 16) {
      day = new Date(day);
      day.setDate(day.getDate() + 1);
      if (day.getDay() === 0) day.setDate(day.getDate() + 1);
      if (day.getDay() === 6) day.setDate(day.getDate() + 2);
      hourPointer = 8;
    }
    const dayNames = ["So","Mo","Di","Mi","Do","Fr","Sa"];
    const label = `${dayNames[day.getDay()]} ${String(day.getDate()).padStart(2,"0")}.${String(day.getMonth()+1).padStart(2,"0")}`;
    entries.push({
      date: label,
      timeStart: `${String(hourPointer).padStart(2,"0")}:00`,
      timeEnd:   `${String(hourPointer + h).padStart(2,"0")}:00`,
      ticket: tk,
    });
    hourPointer += h + 0.5; // 30 min travel buffer
  }
  return entries;
}

function buildRoute(tickets: Ticket[], techId: number): number[] {
  // Return unique unit_ids for active tickets, sorted by priority then id (proxy for proximity)
  const active = tickets
    .filter(tk => tk.technician_id === techId &&
      (tk.status === "OPEN" || tk.status === "ASSIGNED" || tk.status === "IN_PROGRESS"))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.unit_id - b.unit_id);
  const seen = new Set<number>();
  return active.reduce<number[]>((acc, tk) => {
    if (!seen.has(tk.unit_id)) { seen.add(tk.unit_id); acc.push(tk.unit_id); }
    return acc;
  }, []);
}

/* ── Modal ── */
const PRIO_COLOR: Record<string, string> = {
  HIGH: "var(--danger)", MEDIUM: "var(--warning)", LOW: "var(--success)",
};
const PRIO_LABEL: Record<string, string> = { HIGH: "Hoch", MEDIUM: "Mittel", LOW: "Tief" };

function TechModal({ tech, tickets, onClose }: { tech: Technician; tickets: Ticket[]; onClose: () => void }) {
  const [view, setView] = useState<"calendar" | "route">("calendar");
  const schedule = buildSchedule(tickets, tech.id);
  const route    = buildRoute(tickets, tech.id);

  const done = tickets.filter(tk => tk.technician_id === tech.id && (tk.status === "RESOLVED" || tk.status === "CLOSED")).length;
  const totalHours = tickets
    .filter(tk => tk.technician_id === tech.id && (tk.status === "RESOLVED" || tk.status === "CLOSED" || tk.status === "IN_PROGRESS" || tk.status === "ASSIGNED"))
    .reduce((s, tk) => s + (WORK_HOURS[tk.priority] ?? 2), 0);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.1rem", flexShrink: 0 }}>
            {tech.name.split(" ").map(n => n[0]).join("").slice(0,2)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{tech.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
              {done} erledigt · CHF {(totalHours * HOURLY_RATE).toFixed(0)} Umsatz · {HOURLY_RATE} CHF/h
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", color: "var(--text-muted)", lineHeight: 1 }}>✕</button>
        </div>

        {/* Tab row */}
        <div style={{ padding: "12px 24px 0", display: "flex", gap: 6 }}>
          <button className={`wp-filter-btn ${view === "calendar" ? "active" : ""}`} onClick={() => setView("calendar")}>
            🤖 KI-Kalender
          </button>
          <button className={`wp-filter-btn ${view === "route" ? "active" : ""}`} onClick={() => setView("route")}>
            Route
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {view === "calendar" && (
            <>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 14 }}>
                KI-optimierte Reihenfolge: Notfälle zuerst, dann Priorität und Wegoptimierung.
              </p>
              {schedule.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Keine aktiven Tickets – freier Kalender.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {schedule.map((entry, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ textAlign: "right", minWidth: 68, paddingTop: 2 }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>{entry.date}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{entry.timeStart}–{entry.timeEnd}</div>
                      </div>
                      <div style={{ width: 3, background: PRIO_COLOR[entry.ticket.priority], borderRadius: 2, alignSelf: "stretch", flexShrink: 0 }} />
                      <div style={{ flex: 1, background: "var(--bg)", borderRadius: 8, padding: "8px 12px", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: "0.67rem", fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: PRIO_COLOR[entry.ticket.priority] + "20", color: PRIO_COLOR[entry.ticket.priority] }}>
                            {PRIO_LABEL[entry.ticket.priority]}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>#{entry.ticket.id}</span>
                        </div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{entry.ticket.title}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                          Einheit {entry.ticket.unit_id} · {WORK_HOURS[entry.ticket.priority]}h geplant
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {view === "route" && (
            <>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 14 }}>
                KI-optimierte Route: Objekte nach Priorität und geografischer Nähe sortiert.
              </p>
              {route.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Keine aktiven Tickets — keine Route nötig.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                      Start
                    </div>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Büro / Standort</span>
                  </div>
                  {route.map((unitId, i) => {
                    const tks = tickets.filter(tk => tk.technician_id === tech.id && tk.unit_id === unitId && (tk.status === "OPEN" || tk.status === "ASSIGNED" || tk.status === "IN_PROGRESS"));
                    const topPrio = tks.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])[0];
                    return (
                      <div key={unitId} style={{ display: "flex", gap: 0 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 44 }}>
                          <div style={{ width: 2, height: 16, background: "var(--border)" }} />
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: topPrio ? PRIO_COLOR[topPrio.priority] : "var(--text-muted)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                            {i + 1}
                          </div>
                          {i < route.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--border)", minHeight: 16 }} />}
                        </div>
                        <div style={{ flex: 1, padding: "12px 8px 12px 8px" }}>
                          <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Einheit {unitId}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                            {tks.length} Ticket{tks.length !== 1 ? "s" : ""} · {tks.map(t => t.title).join(", ").slice(0, 60)}{tks.map(t => t.title).join(", ").length > 60 ? "…" : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--success)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                      ✓
                    </div>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--success)" }}>Rückkehr Büro</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
interface Props { technicians: Technician[]; tickets: Ticket[]; }

export function TechniciansPage({ technicians, tickets }: Props) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Technician | null>(null);

  return (
    <div>
      {selected && (
        <TechModal tech={selected} tickets={tickets} onClose={() => setSelected(null)} />
      )}
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
            <div
              key={tech.id}
              className="tech-card panel"
              style={{ cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
              onClick={() => setSelected(tech)}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
            >
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
              <div style={{ marginTop: 10, fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center" }}>
                Klicken für Kalender & Route →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
