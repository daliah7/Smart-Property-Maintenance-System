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
const SLA_HOURS: Record<string, number> = { HIGH: 4, MEDIUM: 24, LOW: 72 };

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
type Page = "dashboard" | "tickets" | "analytics" | "portal" | "technicians" | "properties" | "wartungsplan" | "dokumente" | "finanzen" | "berichte";

function NavBar({ active, onNavigate }: { active: Page; onNavigate: (p: Page) => void }) {
  const { t } = useLanguage();
  const tabs: { key: Page; label: string; icon: string }[] = [
    { key: "dashboard",   label: t("navDashboard"),   icon: "◈" },
    { key: "tickets",     label: t("navTickets"),     icon: "◎" },
    { key: "analytics",   label: t("navAnalytics"),   icon: "◆" },
    { key: "portal",      label: t("navPortal"),      icon: "⌂" },
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
                <span className="role-option-desc">Vollzugriff auf Tickets, Mieter, Techniker &amp; Analysen</span>
              </button>
              <button className="role-option role-option-tenant" onClick={() => onSelect("tenant")}>
                <span className="role-option-icon">⌂</span>
                <span className="role-option-label">Mieter</span>
                <span className="role-option-desc">Eigene Tickets erstellen und Status verfolgen</span>
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
  onTicketCreated: () => void;
  onExit: () => void;
}) {
  const { theme, toggle: toggleTheme } = useTheme();
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [idInput, setIdInput]           = useState("");
  const [idError, setIdError]           = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = tenants.find(t => String(t.id) === idInput.trim());
    if (found) { setActiveTenant(found); setIdError(false); }
    else { setIdError(true); setIdInput(""); }
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
              className={`pin-input ${idError ? "pin-input-error" : ""}`}
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={idInput}
              onChange={e => { setIdInput(e.target.value); setIdError(false); }}
              placeholder="Mieter-ID"
              autoFocus
            />
            {idError && <p className="pin-error">Mieter-ID nicht gefunden. Bitte erneut versuchen.</p>}
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
  const [loading, setLoading]               = useState(true);

  const { toasts, push, dismiss } = useToasts();

  const loadTickets = useCallback(async (status?: string) => {
    try {
      const items = await fetchTickets(status || undefined);
      setTickets(items);
      setSelectedTicket(prev => prev ? items.find(i => i.id === prev.id) : undefined);
    } catch (err) {
      push("error", `${t("toastTicketsLoadError")}: ${err}`);
    }
  }, [push, t]);

  const loadInvoiceForTicket = async (ticketId: number) => {
    try { setInvoice(await fetchInvoiceByTicket(ticketId)); }
    catch { setInvoice(undefined); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadTickets(filter || undefined),
      fetchTechnicians().then(setTechnicians),
      fetchUnits().then(setUnits),
      fetchTenants().then(setTenants),
      fetchProperties().then(setProperties),
    ]).catch(err => push("error", String(err))).finally(() => setLoading(false));
  }, [filter]);

  const handleCreateTicket = async (payload: TicketCreatePayload) => {
    try {
      await createTicket(payload);
      await loadTickets(filter || undefined);
      push("success", t("toastTicketCreated"));
    } catch (err) {
      push("error", `${t("toastTicketCreateError")}: ${err}`);
    }
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

  const handleAutoAssign = (id: number) => performAction(() => autoAssignTicket(id), t("toastAutoAssigned"));
  const handleAssign     = (id: number, techId: number) => performAction(() => assignTicket(id, techId), t("toastAssigned"));
  const handleStart      = (id: number) => performAction(() => startTicket(id),   t("toastStarted"));
  const handleResolve    = (id: number) => performAction(() => resolveTicket(id), t("toastResolved"));
  const handleClose      = (id: number) => performAction(() => closeTicket(id),   t("toastClosed"));

  const handlePayInvoice = async (invoiceId: number) => {
    try { setInvoice(await payInvoice(invoiceId)); push("success", t("toastInvoicePaid")); }
    catch (err) { push("error", `${t("toastActionError")}: ${err}`); }
  };

  const handleCreateInvoice = async (ticketId: number, amount: number) => {
    if (amount <= 0) { push("error", t("toastAmountError")); return; }
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
        onTicketCreated={() => loadTickets(filter || undefined)}
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

        {activePage === "analytics" && <AnalyticsPage tickets={tickets} />}

        {activePage === "portal" && (
          <div className="page-container">
            <div className="page-header">
              <div>
                <h2 className="page-title">⌂ Mieter-Portal</h2>
                <p className="page-subtitle">Das Portal ist für Mieter verfügbar. Mieter melden sich mit ihrer Mieter-ID an.</p>
              </div>
            </div>
            <div className="panel" style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 16, opacity: 0.5 }}>⌂</div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: 20 }}>
                Mieter können sich über die Rollenauswahl als <strong>Mieter</strong> anmelden und mit ihrer Mieter-ID auf das Portal zugreifen.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {tenants.slice(0, 6).map(tn => {
                  const u = units.find(u => u.id === tn.unit_id);
                  return (
                    <div key={tn.id} style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: "0.82rem" }}>
                      <div style={{ fontWeight: 600 }}>{tn.name}</div>
                      <div style={{ color: "var(--text-muted)" }}>ID: {tn.id} · {u?.name ?? "—"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

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
          <FinanzenPage tickets={tickets} properties={properties} />
        )}
        {activePage === "berichte" && (
          <BerichtePage tickets={tickets} technicians={technicians} properties={properties} />
        )}
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <AIChat />
    </>
  );
}

export default App;
