import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TicketForm } from "./components/TicketForm";
import { TicketList } from "./components/TicketList";
import { TicketDetail } from "./components/TicketDetail";
import { DashboardPage } from "./components/DashboardPage";
import { TechniciansPage } from "./components/TechniciansPage";
import { PropertiesPage } from "./components/PropertiesPage";
import { AnalyticsPage } from "./components/AnalyticsPage";
import { TenantPortal } from "./components/TenantPortal";
import { AIChat } from "./components/AIChat";
import { WartungsplanPage } from "./components/WartungsplanPage";
import { DokumentePage } from "./components/DokumentePage";
import { FinanzenPage } from "./components/FinanzenPage";
import { BerichtePage } from "./components/BerichtePage";
import { useLanguage } from "./i18n/LanguageContext";
import type { Invoice, Property, Ticket, Technician, TicketCreatePayload, Tenant, Unit } from "./types";
import {
  assignTicket, autoAssignTicket, createInvoice, createTicket,
  fetchInvoiceByTicket, fetchProperties, fetchTechnicians, fetchTickets,
  fetchTenants, fetchUnits, closeTicket, payInvoice, resolveTicket, startTicket,
} from "./api";

/* ─── Toast ─── */
type ToastType = "success" | "error";
interface Toast { id: number; type: ToastType; message: string; exiting?: boolean; }
let toastCounter = 0;

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 220);
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, type, message }]);
    const timer = setTimeout(() => dismiss(id), 4000);
    timers.current.set(id, timer);
    return id;
  }, [dismiss]);

  return { toasts, push, dismiss };
}

/* ─── Theme ─── */
function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    (localStorage.getItem("spms-theme") as "dark" | "light") ?? "dark"
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("spms-theme", theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");
  return { theme, toggle };
}

/* ─── SLA helpers for notification bell ─── */
const SLA_HOURS: Record<string, number> = { HIGH: 24, MEDIUM: 168, LOW: 336 };

function countSLAIssues(tickets: Ticket[]) {
  let escalated = 0, atRisk = 0;
  const now = Date.now();
  for (const t of tickets) {
    if (t.status === "RESOLVED" || t.status === "CLOSED") continue;
    const slaH = SLA_HOURS[t.priority] ?? 24;
    const elapsed = (now - new Date(t.created_at).getTime()) / 3600000;
    if (elapsed > slaH) escalated++;
    else if (elapsed > slaH * 0.8) atRisk++;
  }
  return { escalated, atRisk };
}

/* ─── Language Switcher ─── */
function LangSwitcher() {
  const { lang, setLang } = useLanguage();
  const langs: { code: Parameters<typeof setLang>[0]; flag: string; label: string }[] = [
    { code: "de", flag: "🇩🇪", label: "DE" },
    { code: "en", flag: "🇬🇧", label: "EN" },
    { code: "fr", flag: "🇫🇷", label: "FR" },
    { code: "it", flag: "🇮🇹", label: "IT" },
  ];
  return (
    <div className="lang-switcher" role="group" aria-label="Language / Sprache">
      {langs.map(l => (
        <button key={l.code} className={`lang-btn ${lang === l.code ? "active" : ""}`}
          onClick={() => setLang(l.code)} aria-pressed={lang === l.code}>
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Notification Bell ─── */
function NotificationBell({ tickets }: { tickets: Ticket[] }) {
  const { t, tf } = useLanguage();
  const [open, setOpen] = useState(false);
  const { escalated, atRisk } = countSLAIssues(tickets);
  const total = escalated + atRisk;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const newToday = tickets.filter(tk => new Date(tk.created_at) >= today).length;

  return (
    <div className="notif-wrapper">
      <button className="notif-bell" onClick={() => setOpen(o => !o)} aria-label={t("notifTitle")}>
        🔔
        {total > 0 && <span className="notif-badge">{total}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">{t("notifTitle")}</div>
          {total === 0 && newToday === 0 ? (
            <div className="notif-item notif-none">{t("notifNone")}</div>
          ) : (
            <>
              {escalated > 0 && <div className="notif-item notif-escalated">🚨 {tf("notifEscalated", { n: escalated })}</div>}
              {atRisk > 0 && <div className="notif-item notif-risk">⚠️ {tf("notifAtRisk", { n: atRisk })}</div>}
              {newToday > 0 && <div className="notif-item notif-new">🆕 {tf("notifNew", { n: newToday })}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Navigation ─── */
type Page = "dashboard" | "tickets" | "analytics" | "technicians" | "properties" | "wartungsplan" | "dokumente" | "finanzen" | "berichte";

function NavBar({ active, onNavigate }: { active: Page; onNavigate: (p: Page) => void }) {
  const { t } = useLanguage();
  const tabs: { key: Page; label: string; icon: string }[] = [
    { key: "dashboard",   label: t("navDashboard"),   icon: "◈" },
    { key: "tickets",     label: t("navTickets"),     icon: "◎" },
    { key: "analytics",   label: t("navAnalytics"),   icon: "◆" },
    { key: "technicians",  label: t("navTechnicians"),  icon: "◉" },
    { key: "properties",   label: t("navProperties"),   icon: "⊞" },
    { key: "wartungsplan", label: "Wartungsplan",        icon: "◷" },
    { key: "dokumente",    label: "Dokumente",           icon: "▤" },
    { key: "finanzen",     label: "Finanzen",            icon: "⊠" },
    { key: "berichte",     label: "Berichte",            icon: "▦" },
  ];
  return (
    <nav className="nav-bar" aria-label="Main navigation">
      {tabs.map(tab => (
        <button key={tab.key}
          className={`nav-tab ${active === tab.key ? "active" : ""}`}
          onClick={() => onNavigate(tab.key)}
          aria-current={active === tab.key ? "page" : undefined}>
          <span className="nav-tab-icon">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

/* ─── Toast Container ─── */
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type} ${t.exiting ? "toast-exit" : ""}`} role="alert">
          <span className="toast-icon">{t.type === "success" ? "✓" : "✕"}</span>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Close">×</button>
        </div>
      ))}
    </div>
  );
}

/* ─── Role Selection Screen ─── */
type Role = "manager" | "tenant";

function RoleSelect({ onSelect }: { onSelect: (r: Role) => void }) {
  const [pinStep, setPinStep] = useState(false);
  const [pin, setPin]         = useState("");
  const [error, setError]     = useState(false);

  const handleManagerClick = () => { setPinStep(true); setPin(""); setError(false); };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "777") { onSelect("manager"); }
    else { setError(true); setPin(""); }
  };

  return (
    <div className="role-select-screen">
      <div className="role-select-card">
        <div className="role-select-logo">◈</div>
        <h1 className="role-select-title">Smart Property<br/>Maintenance System</h1>

        {!pinStep ? (
          <>
            <p className="role-select-subtitle">Bitte wählen Sie Ihre Rolle</p>
            <div className="role-select-options">
              <button className="role-option role-option-manager" onClick={handleManagerClick}>
                <span className="role-option-icon">◉</span>
                <span className="role-option-label">Immobilienverwalter</span>
              </button>
              <button className="role-option role-option-tenant" onClick={() => onSelect("tenant")}>
                <span className="role-option-icon">⌂</span>
                <span className="role-option-label">Mieter</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="role-select-subtitle">Zugangscode eingeben</p>
            <form onSubmit={handlePinSubmit} className="pin-form">
              <input
                className={`pin-input ${error ? "pin-input-error" : ""}`}
                type="password"
                inputMode="numeric"
                maxLength={10}
                value={pin}
                onChange={e => { setPin(e.target.value); setError(false); }}
                placeholder="Code"
                autoFocus
              />
              {error && <p className="pin-error">Falscher Code. Bitte erneut versuchen.</p>}
              <button type="submit" className="btn btn-primary btn-full" disabled={!pin}>
                Anmelden
              </button>
              <button type="button" className="btn btn-ghost btn-full" onClick={() => setPinStep(false)}>
                ← Zurück
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Tenant Shell (stripped-down view with Mieter-ID login) ─── */
function TenantShell({
  units, tickets, tenants, onTicketCreated, onExit,
}: {
  units: Unit[];
  tickets: Ticket[];
  tenants: Tenant[];
  onTicketCreated: (ticket: Ticket) => string | undefined;
  onExit: () => void;
}) {
  const { theme, toggle: toggleTheme } = useTheme();
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [idInput, setIdInput] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = idInput.trim();
    if (!trimmed) return;
    // Try to find a real tenant by ID; if not found, create a demo guest
    const found = tenants.find(t => String(t.id) === trimmed);
    if (found) {
      setActiveTenant(found);
    } else {
      // Demo mode: accept any numeric input, create a guest tenant
      const demoUnit = units[0] ?? null;
      setActiveTenant({
        id: Number(trimmed) || 0,
        name: `Demo-Mieter (ID ${trimmed})`,
        unit_id: demoUnit?.id ?? 1,
      } as Tenant);
    }
      };

  if (!activeTenant) {
    return (
      <div className="role-select-screen">
        <div className="role-select-card">
          <div className="role-select-logo">⌂</div>
          <h1 className="role-select-title">Mieter-Portal</h1>
          <p className="role-select-subtitle">Bitte geben Sie Ihre Mieter-ID ein</p>
          <form onSubmit={handleLogin} className="pin-form">
            <input
              className="pin-input"
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={idInput}
              onChange={e => setIdInput(e.target.value)}
              placeholder="Mieter-ID (z.B. 1–20)"
              autoFocus
            />
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", margin: "4px 0" }}>
              Demo: Beliebige Zahl eingeben
            </p>
            <button type="submit" className="btn btn-primary btn-full" disabled={!idInput}>
              Anmelden
            </button>
            <button type="button" className="btn btn-ghost btn-full" onClick={onExit}>
              ← Zurück zur Rollenauswahl
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tenantUnit = units.find(u => u.id === activeTenant.unit_id);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <h1>⌂ Mieter-Portal</h1>
          <p>Willkommen, {activeTenant.name}{tenantUnit ? ` · ${tenantUnit.name}` : ""}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LangSwitcher />
          <button className="theme-toggle" onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="btn btn-ghost" onClick={() => setActiveTenant(null)} title="Abmelden">
            ← Abmelden
          </button>
        </div>
      </header>
      <TenantPortal
        units={units}
        tickets={tickets}
        tenant={activeTenant}
        onTicketCreated={onTicketCreated}
        onShowTicket={() => {}}
      />
    </main>
  );
}

/* ─── Static fallback demo data (used when backend is unreachable) ─── */
const hAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const dAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

const DEMO_TICKETS: Ticket[] = [
  // ── 3 HIGH OPEN: overdue 1–7 h (well within user's requested range) ──
  { id: 1,  title: "Kein warmes Wasser — Notfall",        description: "Warmwasser ausgefallen, Kleinkind im Haushalt.", unit_id: 12, tenant_id: 12, technician_id: undefined, status: "OPEN",        priority: "HIGH",   created_at: hAgo(25), updated_at: hAgo(25) },
  { id: 2,  title: "Stromausfall Küchensteckdose",        description: "Steckdose liefert keinen Strom. Kurzschluss.", unit_id: 4,  tenant_id: 4,  technician_id: undefined, status: "OPEN",        priority: "HIGH",   created_at: hAgo(28), updated_at: hAgo(28) },
  { id: 3,  title: "Aufzug ausser Betrieb",               description: "Aufzug bleibt zwischen EG und 1. OG stecken.", unit_id: 9,  tenant_id: 9,  technician_id: undefined, status: "OPEN",        priority: "HIGH",   created_at: hAgo(31), updated_at: hAgo(31) },
  // ── OPEN non-overdue ──
  { id: 4,  title: "Klimaanlage kühlt nicht mehr",        description: "Klimaanlage produziert keine Kühlung.", unit_id: 6,  tenant_id: 6,  technician_id: undefined, status: "OPEN",        priority: "MEDIUM", created_at: dAgo(2),  updated_at: dAgo(2)  },
  { id: 5,  title: "Storen (Jalousie) klemmt",            description: "Elektrische Storen lässt sich nicht hochfahren.", unit_id: 18, tenant_id: 18, technician_id: undefined, status: "OPEN",   priority: "LOW",    created_at: dAgo(5),  updated_at: dAgo(5)  },
  // ── ASSIGNED: HIGH at risk (~80 %) ──
  { id: 6,  title: "Feuchtigkeitsschaden im Keller",      description: "Wasser dringt durch Kellerwand. Schimmelgefahr.", unit_id: 14, tenant_id: 14, technician_id: 17, status: "ASSIGNED",    priority: "HIGH",   created_at: hAgo(20), updated_at: hAgo(19) },
  { id: 7,  title: "Balkongeländer locker",               description: "Geländer wackelt stark — Sicherheitsrisiko.", unit_id: 16, tenant_id: 16, technician_id: 3,  status: "ASSIGNED",    priority: "HIGH",   created_at: hAgo(18), updated_at: hAgo(17) },
  // ── ASSIGNED: within SLA ──
  { id: 8,  title: "Dachrinne verstopft",                 description: "Dachrinne verstopft, Wasserschaden droht.", unit_id: 7,  tenant_id: 7,  technician_id: 6,  status: "ASSIGNED",    priority: "MEDIUM", created_at: dAgo(3),  updated_at: dAgo(3)  },
  { id: 9,  title: "Wasserhahn tropft im Bad",            description: "Wasserhahn im Badezimmer tropft dauerhaft.", unit_id: 10, tenant_id: 10, technician_id: 2,  status: "ASSIGNED",    priority: "MEDIUM", created_at: dAgo(4),  updated_at: dAgo(4)  },
  { id: 10, title: "Gehwegplatten locker — Sturzgefahr", description: "Gehwegplatten vor dem Seeeingang locker.", unit_id: 13, tenant_id: 13, technician_id: 7,  status: "ASSIGNED",    priority: "MEDIUM", created_at: dAgo(1),  updated_at: dAgo(1)  },
  { id: 11, title: "Türschloss defekt — Haupteingang",   description: "Türschloss klemmt. Einbruchgefahr.", unit_id: 8,  tenant_id: 8,  technician_id: 1,  status: "ASSIGNED",    priority: "HIGH",   created_at: hAgo(12), updated_at: hAgo(11) },
  { id: 12, title: "Gartentor — Schloss kaputt",          description: "Schloss am Gartentor gebrochen.", unit_id: 19, tenant_id: 19, technician_id: 14, status: "ASSIGNED",    priority: "LOW",    created_at: dAgo(7),  updated_at: dAgo(7)  },
  // ── IN_PROGRESS ──
  { id: 13, title: "Lüftungsanlage defekt",               description: "Lüftung macht laute Geräusche und riecht verbrannt.", unit_id: 15, tenant_id: 15, technician_id: 5, status: "IN_PROGRESS", priority: "HIGH", created_at: hAgo(8),  updated_at: hAgo(7)  },
  { id: 14, title: "Heizungsausfall im Wohnzimmer",       description: "Die Heizung heizt seit gestern nicht mehr.", unit_id: 1,  tenant_id: 1,  technician_id: 2,  status: "IN_PROGRESS", priority: "HIGH", created_at: hAgo(15), updated_at: hAgo(14) },
  { id: 15, title: "Rohrbruch im Badezimmer",             description: "Rohr unter Waschbecken gebrochen, Wasser läuft.", unit_id: 17, tenant_id: 17, technician_id: 16, status: "IN_PROGRESS", priority: "HIGH", created_at: hAgo(10), updated_at: hAgo(9) },
  { id: 16, title: "Sicherung springt raus",              description: "Sicherung für Zimmer 2 fliegt täglich raus.", unit_id: 3,  tenant_id: 3,  technician_id: 9,  status: "IN_PROGRESS", priority: "MEDIUM", created_at: dAgo(2), updated_at: dAgo(1)  },
  // ── RESOLVED (SLA mostly met) ──
  { id: 17, title: "Fenster klemmt — Schlafzimmer",       description: "Schlafzimmerfenster lässt sich nicht öffnen.", unit_id: 2,  tenant_id: 2,  technician_id: 3,  status: "RESOLVED",    priority: "MEDIUM", created_at: dAgo(30), updated_at: dAgo(28) },
  { id: 18, title: "Spielplatz-Rutsche locker",            description: "Befestigung der Rutsche muss geprüft werden.", unit_id: 11, tenant_id: 11, technician_id: 4,  status: "RESOLVED",    priority: "LOW",    created_at: dAgo(45), updated_at: dAgo(33) },
  // ── CLOSED ──
  { id: 19, title: "Wandfarbe abgeblättert — Flur",        description: "Farbe im Eingangsflur blättert grossflächig ab.", unit_id: 5,  tenant_id: 5,  technician_id: 10, status: "CLOSED",      priority: "LOW",    created_at: dAgo(60), updated_at: dAgo(53) },
];

const DEMO_PROPERTIES: Property[] = [
  { id: 1, name: "Landmark Residences",      address: "Rosenweg 14, 3007 Bern" },
  { id: 2, name: "Riverside Campus",         address: "Seeburgstrasse 12, 6006 Luzern" },
  { id: 3, name: "Sunset Gardens",           address: "Via Cortivo 8, 6976 Castagnola-Lugano" },
  { id: 4, name: "Zürichberg Residenz",      address: "Zürichbergstrasse 55, 8044 Zürich" },
  { id: 5, name: "Seepark Nidwalden",        address: "Seestrasse 22, 6374 Buochs" },
  { id: 6, name: "Rive du Lac",              address: "Quai du Général-Guisan 34, 1204 Genève" },
  { id: 7, name: "Les Terrasses de Lausanne",address: "Avenue de la Gare 12, 1003 Lausanne" },
];

const DEMO_UNITS: Unit[] = [
  // ── Landmark Residences, Bern (prop 1) ─────────────────────────────────
  { id: 1,  property_id: 1, name: "A1",  floor: "EG",       sqm: 68,  rooms: 3 },
  { id: 2,  property_id: 1, name: "A2",  floor: "EG",       sqm: 72,  rooms: 3 },
  { id: 3,  property_id: 1, name: "A3",  floor: "1. OG",    sqm: 85,  rooms: 4 },
  { id: 20, property_id: 1, name: "A4",  floor: "1. OG",    sqm: 80,  rooms: 3 },
  { id: 21, property_id: 1, name: "A5",  floor: "2. OG",    sqm: 78,  rooms: 3 },
  { id: 22, property_id: 1, name: "A6",  floor: "2. OG",    sqm: 82,  rooms: 4 },
  { id: 23, property_id: 1, name: "A7",  floor: "3. OG",    sqm: 88,  rooms: 4 },
  { id: 24, property_id: 1, name: "A8",  floor: "3. OG",    sqm: 76,  rooms: 3 },
  { id: 25, property_id: 1, name: "A9",  floor: "4. OG",    sqm: 92,  rooms: 4 },
  { id: 26, property_id: 1, name: "A10", floor: "Penthouse", sqm: 148, rooms: 6 },
  // ── Riverside Campus, Luzern (prop 2) ───────────────────────────────────
  { id: 4,  property_id: 2, name: "B1",  floor: "EG",       sqm: 55,  rooms: 2 },
  { id: 5,  property_id: 2, name: "B2",  floor: "1. OG",    sqm: 60,  rooms: 2 },
  { id: 27, property_id: 2, name: "B3",  floor: "1. OG",    sqm: 62,  rooms: 3 },
  { id: 28, property_id: 2, name: "B4",  floor: "2. OG",    sqm: 64,  rooms: 3 },
  { id: 29, property_id: 2, name: "B5",  floor: "2. OG",    sqm: 58,  rooms: 2 },
  { id: 30, property_id: 2, name: "B6",  floor: "3. OG",    sqm: 70,  rooms: 3 },
  { id: 31, property_id: 2, name: "B7",  floor: "3. OG",    sqm: 55,  rooms: 2 },
  { id: 32, property_id: 2, name: "B8",  floor: "4. OG",    sqm: 72,  rooms: 3 },
  { id: 33, property_id: 2, name: "B9",  floor: "Penthouse", sqm: 120, rooms: 5 },
  // ── Sunset Gardens, Lugano (prop 3) ─────────────────────────────────────
  { id: 6,  property_id: 3, name: "C1",  floor: "EG",       sqm: 90,  rooms: 4 },
  { id: 7,  property_id: 3, name: "C2",  floor: "1. OG",    sqm: 78,  rooms: 3 },
  { id: 8,  property_id: 3, name: "C3",  floor: "2. OG",    sqm: 78,  rooms: 3 },
  { id: 34, property_id: 3, name: "C4",  floor: "EG",       sqm: 88,  rooms: 4 },
  { id: 35, property_id: 3, name: "C5",  floor: "1. OG",    sqm: 82,  rooms: 4 },
  { id: 36, property_id: 3, name: "C6",  floor: "2. OG",    sqm: 85,  rooms: 4 },
  { id: 37, property_id: 3, name: "C7",  floor: "3. OG",    sqm: 92,  rooms: 4 },
  { id: 38, property_id: 3, name: "C8",  floor: "3. OG",    sqm: 88,  rooms: 4 },
  { id: 39, property_id: 3, name: "C9",  floor: "4. OG",    sqm: 80,  rooms: 3 },
  { id: 40, property_id: 3, name: "C10", floor: "Penthouse", sqm: 165, rooms: 7 },
  // ── Zürichberg Residenz (prop 4) ─────────────────────────────────────────
  { id: 9,  property_id: 4, name: "D1",  floor: "1. OG",    sqm: 65,  rooms: 3 },
  { id: 10, property_id: 4, name: "D2",  floor: "2. OG",    sqm: 70,  rooms: 3 },
  { id: 11, property_id: 4, name: "D3",  floor: "Penthouse", sqm: 130, rooms: 5 },
  { id: 41, property_id: 4, name: "D4",  floor: "1. OG",    sqm: 68,  rooms: 3 },
  { id: 42, property_id: 4, name: "D5",  floor: "2. OG",    sqm: 72,  rooms: 3 },
  { id: 43, property_id: 4, name: "D6",  floor: "3. OG",    sqm: 78,  rooms: 3 },
  { id: 44, property_id: 4, name: "D7",  floor: "3. OG",    sqm: 82,  rooms: 4 },
  { id: 45, property_id: 4, name: "D8",  floor: "4. OG",    sqm: 86,  rooms: 4 },
  { id: 46, property_id: 4, name: "D9",  floor: "4. OG",    sqm: 90,  rooms: 4 },
  { id: 47, property_id: 4, name: "D10", floor: "Penthouse", sqm: 158, rooms: 6 },
  // ── Seepark Nidwalden (prop 5) ───────────────────────────────────────────
  { id: 12, property_id: 5, name: "E1",  floor: "EG",       sqm: 48,  rooms: 2 },
  { id: 13, property_id: 5, name: "E2",  floor: "1. OG",    sqm: 52,  rooms: 2 },
  { id: 48, property_id: 5, name: "E3",  floor: "EG",       sqm: 50,  rooms: 2 },
  { id: 49, property_id: 5, name: "E4",  floor: "1. OG",    sqm: 54,  rooms: 2 },
  { id: 50, property_id: 5, name: "E5",  floor: "1. OG",    sqm: 56,  rooms: 2 },
  { id: 51, property_id: 5, name: "E6",  floor: "2. OG",    sqm: 54,  rooms: 2 },
  { id: 52, property_id: 5, name: "E7",  floor: "2. OG",    sqm: 58,  rooms: 2 },
  { id: 53, property_id: 5, name: "E8",  floor: "3. OG",    sqm: 62,  rooms: 3 },
  { id: 54, property_id: 5, name: "E9",  floor: "Attika",   sqm: 96,  rooms: 4 },
  // ── Rive du Lac, Genève (prop 6) ────────────────────────────────────────
  { id: 14, property_id: 6, name: "F1",  floor: "EG",       sqm: 82,  rooms: 4 },
  { id: 15, property_id: 6, name: "F2",  floor: "1. OG",    sqm: 82,  rooms: 4 },
  { id: 16, property_id: 6, name: "F3",  floor: "2. OG",    sqm: 76,  rooms: 3 },
  { id: 55, property_id: 6, name: "F4",  floor: "EG",       sqm: 84,  rooms: 4 },
  { id: 56, property_id: 6, name: "F5",  floor: "1. OG",    sqm: 86,  rooms: 4 },
  { id: 57, property_id: 6, name: "F6",  floor: "2. OG",    sqm: 88,  rooms: 4 },
  { id: 58, property_id: 6, name: "F7",  floor: "3. OG",    sqm: 92,  rooms: 4 },
  { id: 59, property_id: 6, name: "F8",  floor: "3. OG",    sqm: 86,  rooms: 4 },
  { id: 60, property_id: 6, name: "F9",  floor: "4. OG",    sqm: 94,  rooms: 4 },
  { id: 61, property_id: 6, name: "F10", floor: "Penthouse", sqm: 185, rooms: 7 },
  // ── Les Terrasses de Lausanne (prop 7) ───────────────────────────────────
  { id: 17, property_id: 7, name: "G1",  floor: "EG",       sqm: 58,  rooms: 2 },
  { id: 18, property_id: 7, name: "G2",  floor: "1. OG",    sqm: 62,  rooms: 3 },
  { id: 19, property_id: 7, name: "G3",  floor: "2. OG",    sqm: 62,  rooms: 3 },
  { id: 62, property_id: 7, name: "G4",  floor: "EG",       sqm: 60,  rooms: 3 },
  { id: 63, property_id: 7, name: "G5",  floor: "1. OG",    sqm: 64,  rooms: 3 },
  { id: 64, property_id: 7, name: "G6",  floor: "2. OG",    sqm: 68,  rooms: 3 },
  { id: 65, property_id: 7, name: "G7",  floor: "3. OG",    sqm: 70,  rooms: 3 },
  { id: 66, property_id: 7, name: "G8",  floor: "3. OG",    sqm: 66,  rooms: 3 },
  { id: 67, property_id: 7, name: "G9",  floor: "4. OG",    sqm: 72,  rooms: 3 },
  { id: 68, property_id: 7, name: "G10", floor: "Attika",   sqm: 112, rooms: 5 },
];

const DEMO_TENANTS: Tenant[] = [
  // ── Bern (Swiss German, wealthy) ───────────────────────────────────────
  { id: 1,  name: "Mia Grün",                   email: "mia.gruen@example.com",                unit_id: 1  },
  { id: 2,  name: "Jonas Weber",                 email: "jonas.weber@example.com",               unit_id: 2  },
  { id: 3,  name: "Lena Fischer",                email: "lena.fischer@example.com",              unit_id: 3  },
  { id: 20, name: "Hans-Peter Ballmer",          email: "hp.ballmer@example.com",                unit_id: 20 },
  { id: 21, name: "Elisabeth Renggli",           email: "e.renggli@example.com",                 unit_id: 21 },
  { id: 22, name: "Rudolf Aeschbach",            email: "r.aeschbach@example.com",               unit_id: 22 },
  { id: 23, name: "Maria-Theresia Stucki",       email: "mt.stucki@example.com",                 unit_id: 23 },
  { id: 24, name: "Kaspar von Wattenwyl",        email: "k.vonwattenwyl@example.com",            unit_id: 24 },
  { id: 25, name: "Béatrice Zumstein",           email: "b.zumstein@example.com",                unit_id: 25 },
  { id: 26, name: "Dr. Christoph Brunner-Moser", email: "ch.brunner-moser@example.com",          unit_id: 26 },
  // ── Luzern (Swiss German) ───────────────────────────────────────────────
  { id: 4,  name: "Sara Klein",                  email: "sara.klein@example.com",                unit_id: 4  },
  { id: 5,  name: "Felix Braun",                 email: "felix.braun@example.com",               unit_id: 5  },
  { id: 27, name: "Ursula Bucher",               email: "u.bucher@example.com",                  unit_id: 27 },
  { id: 28, name: "Peter Schürmann",             email: "p.schurmann@example.com",               unit_id: 28 },
  { id: 29, name: "Monika Kaufmann",             email: "m.kaufmann@example.com",                unit_id: 29 },
  { id: 30, name: "Josef Birrer",                email: "j.birrer@example.com",                  unit_id: 30 },
  { id: 31, name: "Verena Troxler",              email: "v.troxler@example.com",                 unit_id: 31 },
  { id: 32, name: "Martin Gassmann",             email: "m.gassmann@example.com",                unit_id: 32 },
  { id: 33, name: "Dr. Regula Näpfer-Suter",     email: "r.naepfer-suter@example.com",           unit_id: 33 },
  // ── Lugano (Italian / Ticinese) ─────────────────────────────────────────
  { id: 6,  name: "Sophie Müller",               email: "sophie.mueller@example.com",            unit_id: 6  },
  { id: 7,  name: "David Schneider",             email: "david.schneider@example.com",           unit_id: 7  },
  { id: 8,  name: "Anna Bauer",                  email: "anna.bauer@example.com",                unit_id: 8  },
  { id: 34, name: "Lorenzo Bernasconi",          email: "l.bernasconi@example.com",              unit_id: 34 },
  { id: 35, name: "Giulia Fontana",              email: "g.fontana@example.com",                 unit_id: 35 },
  { id: 36, name: "Ettore Cereghetti",           email: "e.cereghetti@example.com",              unit_id: 36 },
  { id: 37, name: "Marta Lepori",                email: "m.lepori@example.com",                  unit_id: 37 },
  { id: 38, name: "Alberto Rezzonico",           email: "a.rezzonico@example.com",               unit_id: 38 },
  { id: 39, name: "Francesca Ponti",             email: "f.ponti@example.com",                   unit_id: 39 },
  { id: 40, name: "Dott. Giorgio Clerici",       email: "g.clerici@example.com",                 unit_id: 40 },
  // ── Zürich (wealthy) ────────────────────────────────────────────────────
  { id: 9,  name: "Lukas Meier",                 email: "lukas.meier@example.com",               unit_id: 9  },
  { id: 10, name: "Nina Keller",                 email: "nina.keller@example.com",               unit_id: 10 },
  { id: 11, name: "Pascal Zimmermann",           email: "pascal.zimmermann@example.com",         unit_id: 11 },
  { id: 41, name: "Katharina Schwarzenbach",     email: "k.schwarzenbach@example.com",           unit_id: 41 },
  { id: 42, name: "Heinrich Honegger",           email: "h.honegger@example.com",                unit_id: 42 },
  { id: 43, name: "Cornelia Escher-Bodmer",      email: "c.escher-bodmer@example.com",           unit_id: 43 },
  { id: 44, name: "Tobias Nägeli",               email: "t.naegeli@example.com",                 unit_id: 44 },
  { id: 45, name: "Franziska Ziegler-Wirth",     email: "f.ziegler-wirth@example.com",           unit_id: 45 },
  { id: 46, name: "Dr. Albert Fonjallaz",        email: "a.fonjallaz@example.com",               unit_id: 46 },
  { id: 47, name: "Prof. Dr. Stefan Bühler",     email: "s.buehler@example.com",                 unit_id: 47 },
  // ── Buochs / Nidwalden ──────────────────────────────────────────────────
  { id: 12, name: "Ursula Gamma",                email: "ursula.gamma@example.com",              unit_id: 12 },
  { id: 13, name: "Bruno Kälin",                 email: "bruno.kaelin@example.com",              unit_id: 13 },
  { id: 48, name: "Bernadette Odermatt",         email: "b.odermatt@example.com",                unit_id: 48 },
  { id: 49, name: "Franz Niederberger",          email: "f.niederberger@example.com",            unit_id: 49 },
  { id: 50, name: "Klara Käslin",                email: "k.kaeslin@example.com",                 unit_id: 50 },
  { id: 51, name: "Alois Christen",              email: "a.christen@example.com",                unit_id: 51 },
  { id: 52, name: "Maria Blättler",              email: "m.blaettler@example.com",               unit_id: 52 },
  { id: 53, name: "Walter Wyrsch",               email: "w.wyrsch@example.com",                  unit_id: 53 },
  { id: 54, name: "Beatrix Durrer-Gasser",       email: "b.durrer-gasser@example.com",           unit_id: 54 },
  // ── Genève (French / wealthy) ───────────────────────────────────────────
  { id: 14, name: "Céline Dupont",               email: "celine.dupont@example.com",             unit_id: 14 },
  { id: 15, name: "Marc Fontaine",               email: "marc.fontaine@example.com",             unit_id: 15 },
  { id: 16, name: "Isabelle Rochat",             email: "isabelle.rochat@example.com",           unit_id: 16 },
  { id: 55, name: "Charles-Henri Pictet",        email: "ch.pictet@example.com",                 unit_id: 55 },
  { id: 56, name: "Hélène de Saussure",          email: "h.desaussure@example.com",              unit_id: 56 },
  { id: 57, name: "Frédéric Bordier",            email: "f.bordier@example.com",                 unit_id: 57 },
  { id: 58, name: "Amélie Lombard",              email: "a.lombard@example.com",                 unit_id: 58 },
  { id: 59, name: "Jean-Pierre Mallet",          email: "jp.mallet@example.com",                 unit_id: 59 },
  { id: 60, name: "Dr. Christine Favre-Bonnet",  email: "c.favre-bonnet@example.com",            unit_id: 60 },
  { id: 61, name: "Baron Philippe Necker",       email: "ph.necker@example.com",                 unit_id: 61 },
  // ── Lausanne (French / Vaud) ────────────────────────────────────────────
  { id: 17, name: "Nathalie Vidal",              email: "nathalie.vidal@example.com",            unit_id: 17 },
  { id: 18, name: "Olivier Chevalier",           email: "olivier.chevalier@example.com",         unit_id: 18 },
  { id: 19, name: "Camille Morel",               email: "camille.morel@example.com",             unit_id: 19 },
  { id: 62, name: "Jean-François Dufour",        email: "jf.dufour@example.com",                 unit_id: 62 },
  { id: 63, name: "Anne-Marie Recordon",         email: "am.recordon@example.com",               unit_id: 63 },
  { id: 64, name: "François Junod",              email: "f.junod@example.com",                   unit_id: 64 },
  { id: 65, name: "Sylvie Meylan",               email: "s.meylan@example.com",                  unit_id: 65 },
  { id: 66, name: "Michel Dubuis",               email: "m.dubuis@example.com",                  unit_id: 66 },
  { id: 67, name: "Marie-Claire Cavin",          email: "mc.cavin@example.com",                  unit_id: 67 },
  { id: 68, name: "Prof. Henri Rosset-Pellet",   email: "h.rosset-pellet@example.com",           unit_id: 68 },
];

const DEMO_TECHNICIANS: Technician[] = [
  { id: 1,  name: "Luka Novak",        expertise: "Elektrik Strom Kurzschluss Elektroinstallation Sicherung" },
  { id: 2,  name: "Ivan Horvat",       expertise: "Sanitär Heizung Wasser Rohrbruch Warmwasser" },
  { id: 3,  name: "Fabien Dupont",     expertise: "Schlosserei Türen Fenster Schloss Einbruch" },
  { id: 4,  name: "Marco Bianchi",     expertise: "Allgemein Maler Wände Fliesen Renovierung" },
  { id: 5,  name: "Tobias Keller",     expertise: "Klimaanlage Lüftung Klimatechnik Kühlung" },
  { id: 6,  name: "Marko Kovač",       expertise: "Dach Dachdecker Abdichtung Dachrinne" },
  { id: 7,  name: "Stéphane Laurent",  expertise: "Garten Aussenanlagen Grünfläche Gehweg" },
  { id: 8,  name: "Reto Amstutz",      expertise: "Aufzug Lift Elevator Aufzugswartung" },
  { id: 9,  name: "Lorenzo Russo",     expertise: "Solar Photovoltaik Solaranlage Energie" },
  { id: 10, name: "Carlos Ibáñez",     expertise: "Maler Farbe Anstrich Tapete Fassade" },
  { id: 11, name: "Yves Crettenand",   expertise: "Boden Parkett Laminat Fliesen Teppich" },
  { id: 12, name: "Chiara Bernasconi", expertise: "IT Netzwerk Internet WLAN Smarthome" },
  { id: 13, name: "Dominik Frei",      expertise: "Brandschutz Feuermelder Sprinkler Sicherheit" },
  { id: 14, name: "Miguel Delgado",    expertise: "Storen Jalousie Rolladen Sonnenschutz" },
  { id: 15, name: "Hannes Lüthi",      expertise: "Schreiner Holz Möbel Einbauschrank Treppe" },
  { id: 16, name: "Pierre Maillard",   expertise: "Sanitärinstallation Wasserleitung Abfluss Rohr" },
  { id: 17, name: "Giorgio Ferretti",  expertise: "Maurer Beton Mauerwerk Risse Keller" },
  { id: 18, name: "Nicole Amstutz",    expertise: "Haustechnik Gebäudetechnik Automation Pumpe" },
  { id: 19, name: "Alexei Volkov",     expertise: "Garage Garagentor Tiefgarage Schranke" },
  { id: 20, name: "Dino Ferrari",      expertise: "Reinigung Hausreinigung Treppenhausreinigung" },
];

/* ─── Local auto-assign: skill match + workload (demo mode) ─── */
function localAutoAssign(ticket: Ticket, techs: Technician[], allTickets: Ticket[]): number {
  const haystack = (ticket.title + " " + ticket.description).toLowerCase();
  const activeCount: Record<number, number> = {};
  for (const tk of allTickets) {
    if (tk.technician_id && (tk.status === "OPEN" || tk.status === "ASSIGNED" || tk.status === "IN_PROGRESS")) {
      activeCount[tk.technician_id] = (activeCount[tk.technician_id] ?? 0) + 1;
    }
  }
  let bestId = techs[0]?.id ?? 1;
  let bestScore = -Infinity;
  for (const tech of techs) {
    const skillScore = tech.expertise.toLowerCase().split(" ").filter(kw => haystack.includes(kw)).length;
    const load = activeCount[tech.id] ?? 0;
    const score = skillScore * 3 - load; // skills dominate, load breaks ties
    if (score > bestScore) { bestScore = score; bestId = tech.id; }
  }
  return bestId;
}

/* ─── Main App ─── */
function App() {
  const { t, tf } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();

  const [role, setRole] = useState<Role | null>(null);
  const [activePage, setActivePage]         = useState<Page>("dashboard");
  const [tickets, setTickets]               = useState<Ticket[]>([]);
  const [technicians, setTechnicians]       = useState<Technician[]>([]);
  const [units, setUnits]                   = useState<Unit[]>([]);
  const [tenants, setTenants]               = useState<Tenant[]>([]);
  const [properties, setProperties]         = useState<Property[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | undefined>();
  const [filter, setFilter]                 = useState("");
  const [invoice, setInvoice]               = useState<Invoice | undefined>();
  const [demoInvoices, setDemoInvoices]     = useState<Invoice[]>([]);
  const [loading, setLoading]               = useState(true);
  const [demoMode, setDemoMode]             = useState(false);

  const { toasts, push, dismiss } = useToasts();

  const loadTickets = useCallback(async (status?: string) => {
    try {
      const items = await fetchTickets(status || undefined);
      setTickets(items);
      setDemoMode(false);
      setSelectedTicket(prev => prev ? items.find(i => i.id === prev.id) : undefined);
    } catch {
      setTickets(prev => prev.length > 0 ? prev : DEMO_TICKETS);
      setDemoMode(true);
    }
  }, []);

  const loadInvoiceForTicket = async (ticketId: number) => {
    if (demoMode) { setInvoice(demoInvoices.find(i => i.ticket_id === ticketId)); return; }
    try { setInvoice(await fetchInvoiceByTicket(ticketId)); }
    catch { setInvoice(undefined); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadTickets(filter || undefined),
      fetchTechnicians().then(setTechnicians).catch(() => setTechnicians(DEMO_TECHNICIANS)),
      fetchUnits().then(setUnits).catch(() => setUnits(DEMO_UNITS)),
      fetchTenants().then(setTenants).catch(() => setTenants(DEMO_TENANTS)),
      fetchProperties().then(setProperties).catch(() => setProperties(DEMO_PROPERTIES)),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [filter]);

  const handleCreateTicket = async (payload: TicketCreatePayload) => {
    if (demoMode) {
      const newId = Math.max(0, ...tickets.map(tk => tk.id)) + 1;
      const newTk: Ticket = {
        id: newId, title: payload.title, description: payload.description,
        unit_id: payload.unit_id, tenant_id: payload.tenant_id,
        technician_id: undefined, status: "OPEN",
        priority: payload.priority ?? "MEDIUM",
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setTickets(prev => [newTk, ...prev]);
      push("success", t("toastTicketCreated"));
      return;
    }
    try {
      await createTicket(payload);
      await loadTickets(filter || undefined);
      push("success", t("toastTicketCreated"));
    } catch (err) {
      push("error", `${t("toastTicketCreateError")}: ${err}`);
    }
  };

  const applyDemoTicketChange = (id: number, changes: Partial<Ticket>, successMsg: string) => {
    const now = new Date().toISOString();
    const apply = (tk: Ticket) => tk.id === id ? { ...tk, ...changes, updated_at: now } : tk;
    setTickets(prev => prev.map(apply));
    setSelectedTicket(prev => prev ? apply(prev) : prev);
    push("success", successMsg);
  };

  const performAction = async (action: () => Promise<Ticket>, successMsg: string) => {
    try {
      const updated = await action();
      setSelectedTicket(updated);
      await loadTickets(filter || undefined);
      push("success", successMsg);
    } catch (err) {
      push("error", `${t("toastActionError")}: ${err}`);
    }
  };

  const handleAutoAssign = (id: number) => {
    if (demoMode) {
      const tk = tickets.find(t => t.id === id);
      if (tk) applyDemoTicketChange(id, { status: "ASSIGNED", technician_id: localAutoAssign(tk, technicians, tickets) }, t("toastAutoAssigned"));
      return;
    }
    performAction(() => autoAssignTicket(id), t("toastAutoAssigned"));
  };
  const handleAssign = (id: number, techId: number) => {
    if (demoMode) { applyDemoTicketChange(id, { status: "ASSIGNED", technician_id: techId }, t("toastAssigned")); return; }
    performAction(() => assignTicket(id, techId), t("toastAssigned"));
  };
  const handleStart = (id: number) => {
    if (demoMode) { applyDemoTicketChange(id, { status: "IN_PROGRESS" }, t("toastStarted")); return; }
    performAction(() => startTicket(id), t("toastStarted"));
  };
  const handleResolve = (id: number) => {
    if (demoMode) { applyDemoTicketChange(id, { status: "RESOLVED" }, t("toastResolved")); return; }
    performAction(() => resolveTicket(id), t("toastResolved"));
  };
  const handleClose = (id: number) => {
    if (demoMode) { applyDemoTicketChange(id, { status: "CLOSED" }, t("toastClosed")); return; }
    performAction(() => closeTicket(id), t("toastClosed"));
  };

  const handlePayInvoice = async (invoiceId: number) => {
    if (demoMode) {
      const paid = invoice ? { ...invoice, paid: true, paid_at: new Date().toISOString() } : undefined;
      if (paid) { setInvoice(paid); setDemoInvoices(prev => prev.map(i => i.id === invoiceId ? paid : i)); }
      push("success", t("toastInvoicePaid"));
      return;
    }
    try { setInvoice(await payInvoice(invoiceId)); push("success", t("toastInvoicePaid")); }
    catch (err) { push("error", `${t("toastActionError")}: ${err}`); }
  };

  const handleCreateInvoice = async (ticketId: number, amount: number) => {
    if (amount <= 0) { push("error", t("toastAmountError")); return; }
    if (demoMode) {
      const newInv: Invoice = { id: Date.now(), ticket_id: ticketId, amount, paid: false, created_at: new Date().toISOString() };
      setDemoInvoices(prev => [...prev.filter(i => i.ticket_id !== ticketId), newInv]);
      setInvoice(newInv);
      push("success", tf("toastInvoiceCreated", { amount: amount.toFixed(2) }));
      return;
    }
    try {
      setInvoice(await createInvoice(ticketId, amount));
      await loadTickets(filter || undefined);
      push("success", tf("toastInvoiceCreated", { amount: amount.toFixed(2) }));
    } catch (err) {
      push("error", `${t("toastActionError")}: ${err}`);
    }
  };

  const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const visibleTickets = useMemo(
    () => [...tickets].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 1, pb = PRIORITY_ORDER[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }),
    [tickets],
  );

  const handleNavigateToTickets = (filterValue: string) => {
    setFilter(filterValue);
    setActivePage("tickets");
  };

  /* ── Role gate ── */
  if (role === null) return <RoleSelect onSelect={setRole} />;

  if (role === "tenant") return (
    <>
      <TenantShell
        units={units}
        tickets={tickets}
        tenants={tenants}
        onTicketCreated={(tk: Ticket) => {
          const techId = localAutoAssign(tk, technicians, tickets);
          const tech = technicians.find(tc => tc.id === techId);
          const assigned: Ticket = { ...tk, technician_id: techId, status: "ASSIGNED", updated_at: new Date().toISOString() };
          setTickets(prev => [assigned, ...prev]);
          return tech?.name;
        }}
        onExit={() => setRole(null)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );

  return (
    <>
      <main className="app-shell">
        {/* Header */}
        <header className="app-header">
          <div className="header-brand">
            <h1>{t("appTitle")}</h1>
            <p>{t("appSubtitle")}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="header-badge">{t("headerBadge")}</div>
            <NotificationBell tickets={tickets} />
            <button className="theme-toggle" onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <LangSwitcher />
            <button className="btn btn-ghost" onClick={() => setRole(null)} title="Abmelden">
              ← Abmelden
            </button>
          </div>
        </header>

        {/* Navigation */}
        <NavBar active={activePage} onNavigate={setActivePage} />

        {/* Pages */}
        {activePage === "dashboard" && (
          <DashboardPage
            tickets={tickets}
            technicians={technicians}
            onNavigateTickets={handleNavigateToTickets}
            onNavigateAnalytics={() => setActivePage("analytics")}
          />
        )}

        {activePage === "tickets" && (
          <div className="layout-grid">
            <div className="column-left">
              <TicketForm units={units} tenants={tenants} onCreate={handleCreateTicket} />
              <TicketList
                tickets={visibleTickets}
                selectedTicketId={selectedTicket?.id}
                loading={loading}
                onSelectTicket={ticket => { setSelectedTicket(ticket); setInvoice(undefined); loadInvoiceForTicket(ticket.id); }}
                onFilterChange={setFilter}
                filter={filter}
              />
            </div>
            <div className="column-right">
              <TicketDetail
                ticket={selectedTicket}
                technicians={technicians}
                allTickets={tickets}
                onAutoAssign={handleAutoAssign}
                onAssign={handleAssign}
                onStart={handleStart}
                onResolve={handleResolve}
                onClose={handleClose}
                onCreateInvoice={handleCreateInvoice}
                onPayInvoice={handlePayInvoice}
                invoice={invoice}
              />
            </div>
          </div>
        )}

        {activePage === "analytics" && <AnalyticsPage tickets={tickets} units={units} properties={properties} />}

        {activePage === "technicians" && (
          <TechniciansPage technicians={technicians} tickets={tickets} />
        )}

        {activePage === "properties" && (
          <PropertiesPage properties={properties} units={units} tenants={tenants} tickets={tickets} />
        )}
        {activePage === "wartungsplan" && (
          <WartungsplanPage properties={properties} technicians={technicians} />
        )}
        {activePage === "dokumente" && (
          <DokumentePage properties={properties} units={units} tenants={tenants} />
        )}
        {activePage === "finanzen" && (
          <FinanzenPage tickets={tickets} properties={properties} technicians={technicians} units={units} />
        )}
        {activePage === "berichte" && (
          <BerichtePage tickets={tickets} technicians={technicians} properties={properties} units={units} />
        )}
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <AIChat />
    </>
  );
}

export default App;
