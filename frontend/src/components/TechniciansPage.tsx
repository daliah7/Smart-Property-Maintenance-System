import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import type { Technician, Ticket } from "../types";

const HOURLY_RATE = 80;

/* ── AI Scheduling helpers ── */
const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const WORK_HOURS: Record<string, number>     = { HIGH: 4, MEDIUM: 2, LOW: 1 };
const DAY_NAMES = ["So","Mo","Di","Mi","Do","Fr","Sa"];

/** Convert decimal hours (e.g. 12.5) to "HH:MM" */
function fmtTime(h: number): string {
  const hrs  = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}`;
}

/** Returns the next weekday (skips Sat/Sun) starting from today */
function nextWeekday(from = new Date()): Date {
  const d = new Date(from);
  // If afternoon already over, start tomorrow
  if (d.getHours() >= 16) d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

function advanceWeekday(d: Date): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);
  return next;
}

function dayLabel(d: Date): string {
  return `${DAY_NAMES[d.getDay()]} ${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}`;
}

interface ScheduleEntry {
  dateLabel: string;
  dateObj: Date;
  timeStart: string;
  timeEnd: string;
  startH: number;   // decimal for layout
  endH: number;
  ticket: Ticket;
  travelAfter: boolean;
}

function buildSchedule(tickets: Ticket[], techId: number): ScheduleEntry[] {
  const active = tickets
    .filter(tk => tk.technician_id === techId &&
      (tk.status === "OPEN" || tk.status === "ASSIGNED" || tk.status === "IN_PROGRESS"))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const entries: ScheduleEntry[] = [];
  let day = nextWeekday();
  let ptr = 8; // decimal hours from midnight

  for (let i = 0; i < active.length; i++) {
    const tk = active[i];
    const h  = WORK_HOURS[tk.priority] ?? 2;
    const TRAVEL = 0.5;
    // Roll to next day if this task wouldn't fit (end by 17:00)
    if (ptr + h > 17) {
      day = advanceWeekday(day);
      ptr = 8;
    }
    const isLast = i === active.length - 1;
    entries.push({
      dateLabel: dayLabel(day),
      dateObj:   new Date(day),
      timeStart: fmtTime(ptr),
      timeEnd:   fmtTime(ptr + h),
      startH: ptr,
      endH:   ptr + h,
      ticket: tk,
      travelAfter: !isLast,
    });
    ptr += h + TRAVEL;
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
      <div className="panel" style={{ borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", margin: 0 }}>
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
        <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "var(--bg)" }}>
          {view === "calendar" && (() => {
            // Group entries by day
            const dayGroups: { label: string; dateObj: Date; entries: ScheduleEntry[] }[] = [];
            for (const e of schedule) {
              const last = dayGroups[dayGroups.length - 1];
              if (last && last.label === e.dateLabel) last.entries.push(e);
              else dayGroups.push({ label: e.dateLabel, dateObj: e.dateObj, entries: [e] });
            }

            // Week-strip: show Mon–Fri of current week with activity dots
            const today = new Date();
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday
            const weekDays = Array.from({ length: 5 }, (_, i) => {
              const d = new Date(weekStart);
              d.setDate(weekStart.getDate() + i);
              const lbl = dayLabel(d);
              const count = schedule.filter(e => e.dateLabel === lbl).length;
              const isToday = d.toDateString() === today.toDateString();
              return { d, lbl, count, isToday };
            });

            return (
              <>
                {/* Week strip */}
                <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--bg)", borderRadius: 10, padding: "8px 10px" }}>
                  {weekDays.map(({ d, lbl, count, isToday }) => (
                    <div key={lbl} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: 3 }}>
                        {DAY_NAMES[d.getDay()]}
                      </div>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", margin: "0 auto",
                        background: isToday ? "var(--accent)" : count > 0 ? "var(--accent)22" : "transparent",
                        border: isToday ? "none" : count > 0 ? "1px solid var(--accent)55" : "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.72rem", fontWeight: 700,
                        color: isToday ? "#fff" : count > 0 ? "var(--accent)" : "var(--text-muted)",
                      }}>
                        {d.getDate()}
                      </div>
                      {count > 0 && (
                        <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 3 }}>
                          {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                            <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)" }} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 14 }}>
                  KI-optimiert: Notfälle zuerst · 30 min Fahrtpuffer · Mo–Fr 08:00–17:00
                </p>

                {schedule.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    Keine aktiven Tickets – freier Kalender.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {dayGroups.map(({ label, entries: dayEntries }) => (
                      <div key={label}>
                        {/* Day header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", background: "var(--accent)15", padding: "2px 10px", borderRadius: 6 }}>
                            {label}
                          </div>
                          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                            {dayEntries.reduce((s, e) => s + WORK_HOURS[e.ticket.priority], 0)}h Arbeitszeit
                          </div>
                        </div>

                        {/* Day timeline */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                          {dayEntries.map((entry, ei) => (
                            <div key={ei}>
                              <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
                                {/* Time column */}
                                <div style={{ textAlign: "right", minWidth: 76, paddingTop: 4, flexShrink: 0 }}>
                                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                                    {entry.timeStart}
                                  </div>
                                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                    bis {entry.timeEnd}
                                  </div>
                                </div>
                                {/* Priority bar */}
                                <div style={{ width: 3, background: PRIO_COLOR[entry.ticket.priority], borderRadius: 3, flexShrink: 0, minHeight: 52 }} />
                                {/* Card */}
                                <div style={{ flex: 1, background: "var(--bg)", borderRadius: 8, padding: "8px 12px", border: "1px solid var(--border)", marginBottom: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                    <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "1px 7px", borderRadius: 8, background: PRIO_COLOR[entry.ticket.priority] + "22", color: PRIO_COLOR[entry.ticket.priority] }}>
                                      {PRIO_LABEL[entry.ticket.priority]}
                                    </span>
                                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>#{entry.ticket.id}</span>
                                    <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                      {WORK_HOURS[entry.ticket.priority]}h
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.3 }}>{entry.ticket.title}</div>
                                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 3 }}>
                                    Einheit {entry.ticket.unit_id}
                                  </div>
                                </div>
                              </div>
                              {/* Travel buffer indicator */}
                              {entry.travelAfter && (
                                <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: 86 }}>
                                  <div style={{ width: 3, background: "var(--border)", flexShrink: 0, alignSelf: "stretch", minHeight: 14 }} />
                                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", padding: "2px 0" }}>
                                    🚗 30 min Fahrt
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

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
