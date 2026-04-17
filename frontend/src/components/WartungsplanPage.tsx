import { useState } from "react";
import type { Property, Technician } from "../types";

interface MaintenanceTask {
  id: number;
  title: string;
  category: string;
  property: string;
  interval: string;
  lastDone: string;
  nextDue: string;
  technician: string;
  status: "ok" | "due_soon" | "overdue";
  notes: string;
}

const SEED_TASKS: MaintenanceTask[] = [
  { id: 1,  title: "Heizungsservice & Brennercheck",  category: "Heizung",      property: "Musterstrasse 12",  interval: "Jährlich",      lastDone: "2024-10-15", nextDue: "2025-10-15", technician: "Externe Firma",       status: "ok",       notes: "Wartungsvertrag Nr. HZ-2024" },
  { id: 2,  title: "Brandmeldeanlage Prüfung",        category: "Brandschutz",  property: "Alle Objekte",      interval: "Jährlich",      lastDone: "2025-01-08", nextDue: "2026-01-08", technician: "Brandschutz AG",       status: "ok",       notes: "Behördliche Vorschrift" },
  { id: 3,  title: "Aufzug Hauptinspektion",          category: "Lift",         property: "Bahnhofstr. 5",     interval: "Alle 2 Jahre",  lastDone: "2024-03-20", nextDue: "2026-03-20", technician: "Schindler AG",         status: "ok",       notes: "TÜV-Zertifikat erforderlich" },
  { id: 4,  title: "Dachkontrolle nach Winter",       category: "Gebäudehülle", property: "Musterstrasse 12",  interval: "Jährlich",      lastDone: "2025-03-01", nextDue: "2026-03-01", technician: "Dachdeckerei Müller",  status: "ok",       notes: "Auf Frostschäden prüfen" },
  { id: 5,  title: "Legionellenprüfung Warmwasser",   category: "Sanitär",      property: "Alle Objekte",      interval: "Jährlich",      lastDone: "2024-11-10", nextDue: "2025-11-10", technician: "Sanitär GmbH",        status: "ok",       notes: "Gesetzliche Pflicht ab 3 Wohnungen" },
  { id: 6,  title: "Feuerlöscher Kontrolle",          category: "Brandschutz",  property: "Alle Objekte",      interval: "Alle 2 Jahre",  lastDone: "2024-06-01", nextDue: "2026-06-01", technician: "Feuerwerk AG",         status: "ok",       notes: "6 Löscher gesamt" },
  { id: 7,  title: "Tiefgarage Lüftungsanlage",       category: "Lüftung",      property: "Bahnhofstr. 5",     interval: "Halbjährlich",  lastDone: "2025-09-15", nextDue: "2026-03-15", technician: "Intern",               status: "due_soon", notes: "Filter tauschen" },
  { id: 8,  title: "Blitzschutzanlage Prüfung",       category: "Elektro",      property: "Musterstrasse 12",  interval: "Alle 4 Jahre",  lastDone: "2022-05-12", nextDue: "2026-05-12", technician: "Elektro Maier",        status: "due_soon", notes: "VDE-Norm 0185" },
  { id: 9,  title: "Elektroverteiler Jahrescheck",    category: "Elektro",      property: "Alle Objekte",      interval: "Jährlich",      lastDone: "2024-12-01", nextDue: "2025-12-01", technician: "Elektro Maier",        status: "ok",       notes: "Protokoll erstellen" },
  { id: 10, title: "Spielplatz Sicherheitsprüfung",   category: "Aussenanlagen",property: "Musterstrasse 12",  interval: "Jährlich",      lastDone: "2024-04-15", nextDue: "2025-04-15", technician: "Intern",               status: "overdue",  notes: "DIN EN 1176 – Haftungsfrage!" },
  { id: 11, title: "Kellerentwässerung reinigen",     category: "Sanitär",      property: "Alle Objekte",      interval: "Alle 3 Jahre",  lastDone: "2023-08-10", nextDue: "2026-08-10", technician: "Rohrreinigung AG",     status: "ok",       notes: "Kamera-Inspektion empfohlen" },
  { id: 12, title: "Gartenanlage Wintercheck",        category: "Aussenanlagen",property: "Musterstrasse 12",  interval: "Jährlich",      lastDone: "2024-11-20", nextDue: "2025-11-20", technician: "Gartenbau Hug",        status: "ok",       notes: "Bewässerung abstellen" },
];

const CATEGORIES = ["Alle", "Heizung", "Brandschutz", "Lift", "Elektro", "Sanitär", "Lüftung", "Gebäudehülle", "Aussenanlagen"];

interface Stoerung {
  id: number;
  anlage: string;
  category: string;
  property: string;
  description: string;
  severity: "kritisch" | "schwerwiegend" | "leicht";
  reportedAt: string;
  status: "offen" | "in_bearbeitung" | "behoben";
  resolvedAt?: string;
  technician: string;
}

const SEV_META: Record<string, { label: string; color: string; icon: string }> = {
  kritisch:      { label: "Kritisch",      color: "var(--danger)",  icon: "!" },
  schwerwiegend: { label: "Schwerwiegend", color: "var(--warning)", icon: "▲" },
  leicht:        { label: "Leicht",        color: "var(--success)", icon: "●" },
};
const STOR_STATUS_META: Record<string, { label: string; color: string }> = {
  offen:          { label: "Offen",           color: "var(--accent)"  },
  in_bearbeitung: { label: "In Bearbeitung",  color: "var(--warning)" },
  behoben:        { label: "Behoben",         color: "var(--success)" },
};

const SEED_STORUNGEN: Stoerung[] = [
  { id: 1,  anlage: "Personenaufzug A2",          category: "Lift",         property: "Landmark Residences",         description: "Kabine bleibt zwischen EG und 1. OG stecken. Notstop aktiv.",                severity: "kritisch",      reportedAt: "2026-04-16", status: "in_bearbeitung", technician: "Schindler AG"          },
  { id: 2,  anlage: "Heizkessel HK-1",            category: "Heizung",      property: "Riverside Campus",            description: "Brenner startet nicht. Fehlercode E04 — Zündelektrode defekt.",             severity: "schwerwiegend", reportedAt: "2026-04-15", status: "in_bearbeitung", technician: "Ivan Horvat"           },
  { id: 3,  anlage: "Tiefgarage Lüftungsanlage",  category: "Lüftung",      property: "Zürichberg Residenz",         description: "Ventilator läuft nicht an. CO-Werte erhöht — Betrieb gesperrt.",            severity: "kritisch",      reportedAt: "2026-04-14", status: "offen",          technician: "Tobias Keller"         },
  { id: 4,  anlage: "Sprinkleranlage UG",          category: "Brandschutz",  property: "Rive du Lac",                 description: "Druckabfall im Sprinklernetz detektiert. Leck möglich.",                    severity: "schwerwiegend", reportedAt: "2026-04-13", status: "offen",          technician: "Brandschutz AG"        },
  { id: 5,  anlage: "Fassade West — Riss EG",     category: "Gebäudehülle", property: "Sunset Gardens",              description: "Vertikaler Riss ca. 80 cm in Aussenwand. Feuchtigkeit eingetreten.",       severity: "schwerwiegend", reportedAt: "2026-04-10", status: "in_bearbeitung", technician: "Giorgio Ferretti"      },
  { id: 6,  anlage: "Wasseraufbereitungsanlage",  category: "Sanitär",      property: "Alle Objekte",                description: "Legionellenprüfung — erhöhter Befund in Strang B3. Sofortmassnahme.",       severity: "kritisch",      reportedAt: "2026-04-09", status: "behoben",        resolvedAt: "2026-04-12", technician: "Sanitär GmbH"          },
  { id: 7,  anlage: "Elektroverteiler EV-2",      category: "Elektro",      property: "Landmark Residences",         description: "Sicherung 32A fliegt täglich aus. Überlast Strang 2.",                       severity: "schwerwiegend", reportedAt: "2026-04-08", status: "behoben",        resolvedAt: "2026-04-10", technician: "Luka Novak"            },
  { id: 8,  anlage: "Dachrinne Nord",             category: "Gebäudehülle", property: "Les Terrasses de Lausanne",   description: "Verstopfung durch Laub. Wasser läuft an Fassade ab — Frostschaden droht.", severity: "leicht",        reportedAt: "2026-04-07", status: "behoben",        resolvedAt: "2026-04-08", technician: "Marko Kovač"           },
  { id: 9,  anlage: "Pumpengruppe HK Heizung",    category: "Heizung",      property: "Seepark Nidwalden",           description: "Pumpe läuft, fördert aber keine Wärme. Lager verschlissen.",               severity: "schwerwiegend", reportedAt: "2026-04-06", status: "behoben",        resolvedAt: "2026-04-09", technician: "Nicole Amstutz"        },
  { id: 10, anlage: "Feuermeldeanlage FMA-3",     category: "Brandschutz",  property: "Zürichberg Residenz",         description: "Melder Raum 3.04 löst Fehlalarm aus. Sensor verschmutzt.",                   severity: "leicht",        reportedAt: "2026-04-05", status: "behoben",        resolvedAt: "2026-04-06", technician: "Dominik Frei"          },
  { id: 11, anlage: "Aufzug Serviceaufzug UG",    category: "Lift",         property: "Riverside Campus",            description: "Türe schliesst nicht vollständig. Sicherheitsverriegelung aktiv.",          severity: "schwerwiegend", reportedAt: "2026-04-04", status: "offen",          technician: "Reto Amstutz"          },
  { id: 12, anlage: "Photovoltaikanlage Dach",    category: "Elektro",      property: "Sunset Gardens",              description: "Wechselrichter zeigt Fehler F12. Einspeisung 40 % reduziert.",              severity: "leicht",        reportedAt: "2026-04-03", status: "in_bearbeitung", technician: "Lorenzo Russo"         },
  { id: 13, anlage: "Gartentor Tiefgarage",       category: "Aussenanlagen",property: "Rive du Lac",                 description: "Schranke öffnet nicht auf Funk. Antriebsmotor defekt.",                      severity: "leicht",        reportedAt: "2026-04-02", status: "behoben",        resolvedAt: "2026-04-04", technician: "Alexei Volkov"         },
  { id: 14, anlage: "Abwasserhebeanlage",         category: "Sanitär",      property: "Landmark Residences",         description: "Niveau-Alarm ausgelöst. Schwimmer klemmt — UG kann nicht entwässern.",     severity: "kritisch",      reportedAt: "2026-03-28", status: "behoben",        resolvedAt: "2026-03-29", technician: "Pierre Maillard"       },
  { id: 15, anlage: "Lüftungsanlage Wohnungen",   category: "Lüftung",      property: "Les Terrasses de Lausanne",   description: "Filter überfällig — Luftmenge 30 % unter Soll. Filterersatz nötig.",         severity: "leicht",        reportedAt: "2026-03-25", status: "behoben",        resolvedAt: "2026-03-27", technician: "Tobias Keller"         },
];

const STATUS_META = {
  ok:        { label: "In Ordnung",  color: "var(--success)", icon: "✓" },
  due_soon:  { label: "Bald fällig", color: "var(--warning)", icon: "▲" },
  overdue:   { label: "Überfällig",  color: "var(--danger)",  icon: "!" },
};

interface Props { properties: Property[]; technicians: Technician[]; tickets?: never; }

export function WartungsplanPage({ properties, technicians }: Props) {
  const [tab, setTab]         = useState<"tasks" | "stoerungen">("tasks");
  const [filter, setFilter]   = useState("Alle");
  const [tasks, setTasks]     = useState<MaintenanceTask[]>(SEED_TASKS);
  const [showAdd, setShowAdd] = useState(false);
  const [storFilter, setStorFilter] = useState<"all" | "offen" | "behoben">("all");
  const [storungen, setStorungen]   = useState<Stoerung[]>(SEED_STORUNGEN);
  const [newTask, setNewTask] = useState({
    title: "", category: "Heizung", property: "", interval: "Jährlich",
    nextDue: "", technician: "", notes: "",
  });

  const filtered = filter === "Alle" ? tasks : tasks.filter(t => t.category === filter);
  const counts = {
    ok:       tasks.filter(t => t.status === "ok").length,
    due_soon: tasks.filter(t => t.status === "due_soon").length,
    overdue:  tasks.filter(t => t.status === "overdue").length,
  };

  const visibleStorungen = storungen.filter(s => {
    if (storFilter === "offen")   return s.status === "offen" || s.status === "in_bearbeitung";
    if (storFilter === "behoben") return s.status === "behoben";
    return true;
  });
  const storCounts = {
    open:   storungen.filter(s => s.status === "offen" || s.status === "in_bearbeitung").length,
    behoben: storungen.filter(s => s.status === "behoben").length,
  };

  const markStorungBehoben = (id: number) => {
    setStorungen(prev => prev.map(s => s.id === id ? { ...s, status: "behoben" as const, resolvedAt: new Date().toISOString().slice(0, 10) } : s));
  };

  const markDone = (id: number) => {
    const today = new Date().toISOString().slice(0, 10);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, lastDone: today, status: "ok" } : t));
  };

  const addTask = () => {
    if (!newTask.title || !newTask.nextDue) return;
    setTasks(prev => [...prev, { ...newTask, id: Date.now(), lastDone: "—", status: "ok" }]);
    setNewTask({ title: "", category: "Heizung", property: "", interval: "Jährlich", nextDue: "", technician: "", notes: "" });
    setShowAdd(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">◷ Wartungsplan</h2>
          <p className="page-subtitle">Wiederkehrende Instandhaltungsaufgaben und Störungsmeldungen</p>
        </div>
        {tab === "tasks" && (
          <button className="btn btn-primary" onClick={() => setShowAdd(s => !s)}>+ Aufgabe hinzufügen</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <button className={`wp-filter-btn ${tab === "tasks" ? "active" : ""}`} onClick={() => setTab("tasks")}>
          Wartungsaufgaben
        </button>
        <button className={`wp-filter-btn ${tab === "stoerungen" ? "active" : ""}`} onClick={() => setTab("stoerungen")}>
          Störungsmeldungen
          {storCounts.open > 0 && (
            <span style={{ marginLeft: 6, background: "var(--danger)", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: "0.7rem", fontWeight: 700 }}>{storCounts.open}</span>
          )}
        </button>
      </div>

      {/* ── WARTUNGSAUFGABEN ── */}
      {tab === "tasks" && (
        <>
          <div className="wp-kpi-row">
            <div className="wp-kpi wp-kpi-ok">
              <span className="wp-kpi-val">{counts.ok}</span>
              <span className="wp-kpi-label">In Ordnung</span>
            </div>
            <div className="wp-kpi wp-kpi-soon">
              <span className="wp-kpi-val">{counts.due_soon}</span>
              <span className="wp-kpi-label">Bald fällig</span>
            </div>
            <div className="wp-kpi wp-kpi-over">
              <span className="wp-kpi-val">{counts.overdue}</span>
              <span className="wp-kpi-label">Überfällig</span>
            </div>
            <div className="wp-kpi">
              <span className="wp-kpi-val">{tasks.length}</span>
              <span className="wp-kpi-label">Total Aufgaben</span>
            </div>
          </div>

          {showAdd && (
            <div className="panel wp-add-form">
              <h3 className="panel-title" style={{ marginBottom: 16 }}>Neue Wartungsaufgabe</h3>
              <div className="wp-add-grid">
                <label className="form-label">Titel
                  <input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="z.B. Heizungsservice" />
                </label>
                <label className="form-label">Kategorie
                  <select value={newTask.category} onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="form-label">Objekt
                  <input value={newTask.property} onChange={e => setNewTask(p => ({ ...p, property: e.target.value }))} placeholder="Objekt / Alle Objekte" />
                </label>
                <label className="form-label">Intervall
                  <select value={newTask.interval} onChange={e => setNewTask(p => ({ ...p, interval: e.target.value }))}>
                    {["Monatlich","Halbjährlich","Jährlich","Alle 2 Jahre","Alle 3 Jahre","Alle 4 Jahre"].map(i => <option key={i}>{i}</option>)}
                  </select>
                </label>
                <label className="form-label">Nächste Fälligkeit
                  <input type="date" value={newTask.nextDue} onChange={e => setNewTask(p => ({ ...p, nextDue: e.target.value }))} />
                </label>
                <label className="form-label">Techniker / Firma
                  <input value={newTask.technician} onChange={e => setNewTask(p => ({ ...p, technician: e.target.value }))} placeholder="z.B. Externe Firma" />
                </label>
              </div>
              <label className="form-label" style={{ marginTop: 8 }}>Notizen
                <input value={newTask.notes} onChange={e => setNewTask(p => ({ ...p, notes: e.target.value }))} placeholder="Vertragsnummer, Vorschrift, Hinweise…" />
              </label>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="btn btn-primary" onClick={addTask}>Speichern</button>
                <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Abbrechen</button>
              </div>
            </div>
          )}

          <div className="wp-filter-row">
            {CATEGORIES.map(c => (
              <button key={c} className={`wp-filter-btn ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>

          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div className="wp-table-header">
              <span className="wp-col-task">Aufgabe</span>
              <span className="wp-col-date">Zuletzt</span>
              <span className="wp-col-date">Nächste Fälligkeit</span>
              <span className="wp-col-tech">Zuständig</span>
              <span className="wp-col-status">Status</span>
              <span className="wp-col-action"></span>
            </div>
            <div className="wp-task-list">
              {filtered.length === 0 && (
                <div style={{ padding: "24px 20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Keine Aufgaben in dieser Kategorie.
                </div>
              )}
              {filtered.map(task => {
                const s = STATUS_META[task.status];
                return (
                  <div key={task.id} className={`wp-table-row wp-row-${task.status}`}>
                    <div className="wp-col-task wp-task-info">
                      <span className="wp-task-status-icon" style={{ color: s.color }}>{s.icon}</span>
                      <div>
                        <div className="wp-task-title">{task.title}</div>
                        <div className="wp-task-meta">
                          <span className="wp-tag">{task.category}</span>
                          <span className="wp-meta-sep">·</span>
                          <span>{task.property}</span>
                          <span className="wp-meta-sep">·</span>
                          <span>{task.interval}</span>
                        </div>
                        {task.notes && <div className="wp-task-notes">{task.notes}</div>}
                      </div>
                    </div>
                    <div className="wp-col-date">
                      <span className="wp-date-val">{task.lastDone}</span>
                    </div>
                    <div className="wp-col-date">
                      <span className="wp-date-val" style={{ color: s.color, fontWeight: 600 }}>{task.nextDue}</span>
                    </div>
                    <div className="wp-col-tech">
                      <span className="wp-date-val">{task.technician}</span>
                    </div>
                    <div className="wp-col-status">
                      <span className="wp-status-badge" style={{
                        background: s.color + "1a",
                        color: s.color,
                        border: `1px solid ${s.color}44`,
                      }}>{s.label}</span>
                    </div>
                    <div className="wp-col-action">
                      {task.status !== "ok" && (
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: "0.75rem", padding: "4px 12px", whiteSpace: "nowrap" }}
                          onClick={() => markDone(task.id)}
                        >
                          ✓ Erledigt
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── STÖRUNGSMELDUNGEN (technische Anlagen) ── */}
      {tab === "stoerungen" && (
        <>
          <div className="wp-kpi-row">
            <div className="wp-kpi wp-kpi-over">
              <span className="wp-kpi-val">{storCounts.open}</span>
              <span className="wp-kpi-label">Aktive Störungen</span>
            </div>
            <div className="wp-kpi wp-kpi-ok">
              <span className="wp-kpi-val">{storCounts.behoben}</span>
              <span className="wp-kpi-label">Behobene Störungen</span>
            </div>
            <div className="wp-kpi">
              <span className="wp-kpi-val">{storungen.length}</span>
              <span className="wp-kpi-label">Total Meldungen</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {([["all","Alle"],["offen","Aktiv"],["behoben","Behoben"]] as const).map(([f, label]) => (
              <button key={f} className={`wp-filter-btn ${storFilter === f ? "active" : ""}`} onClick={() => setStorFilter(f)}>
                {label}
              </button>
            ))}
          </div>

          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div className="wp-task-list">
              {visibleStorungen.length === 0 && (
                <div style={{ padding: "32px 20px", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>
                  Keine Störungsmeldungen in dieser Kategorie.
                </div>
              )}
              {visibleStorungen.map(s => {
                const sev = SEV_META[s.severity];
                const st  = STOR_STATUS_META[s.status];
                return (
                  <div key={s.id} className="wp-table-row" style={{ padding: "14px 20px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: sev.color + "1a", color: sev.color, border: `1px solid ${sev.color}44` }}>
                          {sev.icon} {sev.label}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>{s.anlage}</span>
                        <span className="wp-tag">{s.category}</span>
                        <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--text-muted)" }}>{s.property}</span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 6 }}>{s.description}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: st.color + "1a", color: st.color, border: `1px solid ${st.color}44` }}>
                          {st.label}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Gemeldet: {s.reportedAt}</span>
                        {s.resolvedAt && <span style={{ fontSize: "0.72rem", color: "var(--success)" }}>Behoben: {s.resolvedAt}</span>}
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Zuständig: {s.technician}</span>
                        {s.status !== "behoben" && (
                          <button className="btn btn-ghost" style={{ fontSize: "0.72rem", padding: "3px 10px", marginLeft: "auto" }} onClick={() => markStorungBehoben(s.id)}>
                            ✓ Als behoben markieren
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* suppress unused prop warnings */}
      {(properties.length === 0 || technicians.length === 0) && null}
    </div>
  );
}
