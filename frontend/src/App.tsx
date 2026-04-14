import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TicketForm } from "./components/TicketForm";
import { TicketList } from "./components/TicketList";
import { TicketDetail } from "./components/TicketDetail";
import { DashboardPage } from "./components/DashboardPage";
import { TechniciansPage } from "./components/TechniciansPage";
import { PropertiesPage } from "./components/PropertiesPage";
import { useLanguage } from "./i18n/LanguageContext";
import type { Invoice, Property, Ticket, Technician, TicketCreatePayload, Tenant, Unit } from "./types";
import {
  assignTicket,
  autoAssignTicket,
  createInvoice,
  createTicket,
  fetchInvoiceByTicket,
  fetchProperties,
  fetchTechnicians,
  fetchTickets,
  fetchTenants,
  fetchUnits,
  closeTicket,
  payInvoice,
  resolveTicket,
  startTicket,
} from "./api";

/* ─── Toast ─── */
type ToastType = "success" | "error";
interface Toast { id: number; type: ToastType; message: string; exiting?: boolean; }
let toastCounter = 0;

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 220);
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    const timer = setTimeout(() => dismiss(id), 4000);
    timers.current.set(id, timer);
    return id;
  }, [dismiss]);

  return { toasts, push, dismiss };
}

/* ─── Language Switcher ─── */
function LangSwitcher() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="lang-switcher" role="group" aria-label="Language / Sprache">
      <button className={`lang-btn ${lang === "de" ? "active" : ""}`} onClick={() => setLang("de")} aria-pressed={lang === "de"}>
        🇩🇪 DE
      </button>
      <button className={`lang-btn ${lang === "en" ? "active" : ""}`} onClick={() => setLang("en")} aria-pressed={lang === "en"}>
        🇬🇧 EN
      </button>
    </div>
  );
}

/* ─── Navigation ─── */
type Page = "dashboard" | "tickets" | "technicians" | "properties";

function Sidebar({ active, onNavigate }: { active: Page; onNavigate: (p: Page) => void }) {
  const { t } = useLanguage();
  const tabs: { key: Page; label: string; icon: string }[] = [
    { key: "dashboard",   label: t("navDashboard"),   icon: "◈" },
    { key: "tickets",     label: t("navTickets"),     icon: "◎" },
    { key: "technicians", label: t("navTechnicians"), icon: "◉" },
    { key: "properties",  label: t("navProperties"),  icon: "⊞" },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">🏠</span>
        <div>
          <div className="sidebar-logo-text">SPMS</div>
          <div className="sidebar-logo-sub">Property Mgmt</div>
        </div>
      </div>

      <span className="sidebar-section-label">Menu</span>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`nav-item ${active === tab.key ? "active" : ""}`}
            onClick={() => onNavigate(tab.key)}
            aria-current={active === tab.key ? "page" : undefined}
          >
            <span className="nav-item-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <LangSwitcher />
      </div>
    </aside>
  );
}

/* ─── Toast Container ─── */
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type} ${t.exiting ? "toast-exit" : ""}`} role="alert">
          <span className="toast-icon">{t.type === "success" ? "✓" : "✕"}</span>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Close">×</button>
        </div>
      ))}
    </div>
  );
}

/* ─── Main App ─── */
function App() {
  const { t, tf } = useLanguage();

  const [activePage, setActivePage]             = useState<Page>("dashboard");
  const [tickets, setTickets]                   = useState<Ticket[]>([]);
  const [technicians, setTechnicians]           = useState<Technician[]>([]);
  const [units, setUnits]                       = useState<Unit[]>([]);
  const [tenants, setTenants]                   = useState<Tenant[]>([]);
  const [properties, setProperties]             = useState<Property[]>([]);
  const [selectedTicket, setSelectedTicket]     = useState<Ticket | undefined>();
  const [filter, setFilter]                     = useState("");
  const [invoice, setInvoice]                   = useState<Invoice | undefined>();
  const [loading, setLoading]                   = useState(true);

  const { toasts, push, dismiss } = useToasts();

  const loadTickets = useCallback(async (status?: string) => {
    try {
      const items = await fetchTickets(status || undefined);
      setTickets(items);
      setSelectedTicket((prev) => (prev ? items.find((i) => i.id === prev.id) : undefined));
    } catch (err) {
      push("error", `${t("toastTicketsLoadError")}: ${err}`);
    }
  }, [push, t]);

  const loadInvoiceForTicket = async (ticketId: number) => {
    try {
      setInvoice(await fetchInvoiceByTicket(ticketId));
    } catch {
      setInvoice(undefined);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadTickets(filter || undefined),
      fetchTechnicians().then(setTechnicians),
      fetchUnits().then(setUnits),
      fetchTenants().then(setTenants),
      fetchProperties().then(setProperties),
    ])
      .catch((err) => push("error", String(err)))
      .finally(() => setLoading(false));
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
    try {
      setInvoice(await payInvoice(invoiceId));
      push("success", t("toastInvoicePaid"));
    } catch (err) {
      push("error", `${t("toastActionError")}: ${err}`);
    }
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
    () =>
      [...tickets].sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 1;
        const pb = PRIORITY_ORDER[b.priority] ?? 1;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [tickets],
  );

  /* Navigate to tickets with optional filter */
  const handleNavigateToTickets = (filterValue: string) => {
    setFilter(filterValue);
    setActivePage("tickets");
  };

  const PAGE_TITLES: Record<Page, string> = {
    dashboard:   t("navDashboard"),
    tickets:     t("navTickets"),
    technicians: t("navTechnicians"),
    properties:  t("navProperties"),
  };

  return (
    <>
      <div className="app-layout">
        <Sidebar active={activePage} onNavigate={setActivePage} />

        <div className="main-wrapper">
          {/* Top Bar */}
          <header className="topbar">
            <span className="topbar-title">{PAGE_TITLES[activePage]}</span>
            <div className="topbar-right">
              <div className="header-badge">{t("headerBadge")}</div>
            </div>
          </header>

          {/* Pages */}
          <main className="main-content">
            {activePage === "dashboard" && (
              <DashboardPage
                tickets={tickets}
                technicians={technicians}
                onNavigateTickets={handleNavigateToTickets}
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
                    onSelectTicket={(ticket) => {
                      setSelectedTicket(ticket);
                      setInvoice(undefined);
                      loadInvoiceForTicket(ticket.id);
                    }}
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

            {activePage === "technicians" && (
              <TechniciansPage technicians={technicians} tickets={tickets} />
            )}

            {activePage === "properties" && (
              <PropertiesPage
                properties={properties}
                units={units}
                tenants={tenants}
                tickets={tickets}
              />
            )}
          </main>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

export default App;
