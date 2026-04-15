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

const STATUS_META = {
  ok:        { label: "In Ordnung",  color: "var(--success)", icon: "✓" },
  due_soon:  { label: "Bald fällig", color: "var(--warning)", icon: "▲" },
  overdue:   { label: "Überfällig",  color: "var(--danger)",  icon: "!" },
};

interface Props { properties: Property[]; technicians: Technician[]; }

export function WartungsplanPage({ properties, technicians }: Props) {
  const [filter, setFilter]   = useState("Alle");
  const [tasks, setTasks]     = useState<MaintenanceTask[]>(SEED_TASKS);
  const [showAdd, setShowAdd] = useState(false);
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
          <p className="page-subtitle">Wiederkehrende Instandhaltungsaufgaben und Prüfpflichten</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(s => !s)}>+ Aufgabe hinzufügen</button>
      </div>

      {/* KPI row */}
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

      {/* Add form */}
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

      {/* Category filter */}
      <div className="wp-filter-row">
        {CATEGORIES.map(c => (
          <button key={c} className={`wp-filter-btn ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>

      {/* Table */}
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        {/* Column headers */}
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
                {/* Task info */}
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

                {/* Zuletzt */}
                <div className="wp-col-date">
                  <span className="wp-date-val">{task.lastDone}</span>
                </div>

                {/* Nächste Fälligkeit */}
                <div className="wp-col-date">
                  <span className="wp-date-val" style={{ color: s.color, fontWeight: 600 }}>{task.nextDue}</span>
                </div>

                {/* Techniker */}
                <div className="wp-col-tech">
                  <span className="wp-date-val">{task.technician}</span>
                </div>

                {/* Status badge */}
                <div className="wp-col-status">
                  <span className="wp-status-badge" style={{
                    background: s.color + "1a",
                    color: s.color,
                    border: `1px solid ${s.color}44`,
                  }}>{s.label}</span>
                </div>

                {/* Action */}
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
    </div>
  );
}
