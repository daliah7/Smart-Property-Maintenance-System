import { useEffect, useState } from "react";
import type { Property, Ticket, Technician, Unit } from "../types";
import { fetchInvoiceByTicket } from "../api";

interface InvoiceRow {
  ticketId: number;
  ticketTitle: string;
  amount: number;
  paid: boolean;
  date: string;
  property: string;
  technicianId?: number;
}

interface Props {
  tickets: Ticket[];
  properties: Property[];
  technicians: Technician[];
  units: Unit[];
}

const HOURLY_RATE = 80; // CHF/h internal rate
const MONTH_NAMES = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

/* Estimate hours worked per ticket by priority */
function estimateHours(priority: string): number {
  if (priority === "HIGH")   return 4;
  if (priority === "MEDIUM") return 2;
  return 1;
}

export function FinanzenPage({ tickets, properties, technicians, units }: Props) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"all" | "paid" | "open">("all");
  const [tab, setTab]           = useState<"invoices" | "personnel">("invoices");

  useEffect(() => {
    setLoading(true);
    Promise.allSettled(
      tickets.map(t => fetchInvoiceByTicket(t.id).then(inv => ({ t, inv })))
    ).then(results => {
      const fulfilled = results.filter(r => r.status === "fulfilled") as PromiseFulfilledResult<{ t: (typeof tickets)[0]; inv: { amount: number; paid: boolean; created_at?: string } }>[];
      const rows: InvoiceRow[] = [];

      if (fulfilled.length === 0) {
        // Demo / offline mode — generate invoice rows from resolved & closed tickets
        const billable = tickets.filter(tk => tk.status === "RESOLVED" || tk.status === "CLOSED");
        for (const tk of billable) {
          const unit = units.find(u => u.id === tk.unit_id);
          const prop = unit ? properties.find(p => p.id === unit.property_id) : null;
          const h = estimateHours(tk.priority);
          const materials = tk.priority === "HIGH" ? h * HOURLY_RATE * 0.5 : tk.priority === "MEDIUM" ? h * HOURLY_RATE * 0.25 : 0;
          const amount = Math.round(h * HOURLY_RATE + materials);
          rows.push({
            ticketId: tk.id, ticketTitle: tk.title,
            amount, paid: tk.status === "CLOSED" || tk.id % 3 !== 0,
            date: (tk.updated_at ?? tk.created_at).slice(0, 10),
            property: prop?.name ?? "Unbekannt",
            technicianId: tk.technician_id,
          });
        }
      } else {
        for (const r of fulfilled) {
          const { t, inv } = r.value;
          const unit = units.find(u => u.id === t.unit_id);
          const prop = unit ? properties.find(p => p.id === unit.property_id) : null;
          rows.push({
            ticketId: t.id, ticketTitle: t.title,
            amount: Number(inv.amount), paid: inv.paid,
            date: inv.created_at ? String(inv.created_at).slice(0, 10) : "—",
            property: prop?.name ?? "Unbekannt",
            technicianId: t.technician_id,
          });
        }
      }
      setInvoices(rows);
      setLoading(false);
    });
  }, [tickets, properties, units]);

  /* ── Invoice KPIs ── */
  const total   = invoices.reduce((s, i) => s + i.amount, 0);
  const paid    = invoices.filter(i => i.paid).reduce((s, i) => s + i.amount, 0);
  const open    = total - paid;
  const visible = invoices.filter(i => filter === "all" ? true : filter === "paid" ? i.paid : !i.paid);

  /* Monthly totals for last 6 months */
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const sum = invoices.filter(inv => inv.date.startsWith(key)).reduce((s, inv) => s + inv.amount, 0);
    return { label: MONTH_NAMES[d.getMonth()], sum };
  });
  const maxBar = Math.max(...monthly.map(m => m.sum), 1);

  /* Cost per property (from invoices) */
  const byProp: Record<string, number> = {};
  for (const inv of invoices) byProp[inv.property] = (byProp[inv.property] ?? 0) + inv.amount;

  /* ── Personnel / Technician Revenue ── */
  const doneTickets = tickets.filter(tk => tk.technician_id && (tk.status === "RESOLVED" || tk.status === "CLOSED" || tk.status === "IN_PROGRESS" || tk.status === "ASSIGNED"));

  /* Per-technician revenue */
  const techRevenue: Record<number, { name: string; hours: number; revenue: number; ticketCount: number }> = {};
  for (const tk of doneTickets) {
    if (!tk.technician_id) continue;
    const tech = technicians.find(t => t.id === tk.technician_id);
    if (!tech) continue;
    const h = estimateHours(tk.priority);
    if (!techRevenue[tech.id]) techRevenue[tech.id] = { name: tech.name, hours: 0, revenue: 0, ticketCount: 0 };
    techRevenue[tech.id].hours    += h;
    techRevenue[tech.id].revenue  += h * HOURLY_RATE;
    techRevenue[tech.id].ticketCount++;
  }
  const techRows = Object.values(techRevenue).sort((a, b) => b.revenue - a.revenue);
  const totalPersonnelRevenue = techRows.reduce((s, r) => s + r.revenue, 0);

  /* Per-property personnel cost */
  const propPersonnel: Record<string, number> = {};
  for (const tk of doneTickets) {
    if (!tk.technician_id) continue;
    const unit = units.find(u => u.id === tk.unit_id);
    const prop = unit ? properties.find(p => p.id === unit.property_id) : null;
    if (!prop) continue;
    propPersonnel[prop.name] = (propPersonnel[prop.name] ?? 0) + estimateHours(tk.priority) * HOURLY_RATE;
  }
  const propPersonnelRows = Object.entries(propPersonnel).sort((a, b) => b[1] - a[1]);
  const maxPropPersonnel = Math.max(...propPersonnelRows.map(([, v]) => v), 1);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">⊠ Finanzen</h2>
          <p className="page-subtitle">Rechnungsübersicht, Personalkosten und Technikerumsatz</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="fin-kpi-row">
        <div className="fin-kpi-card">
          <span className="fin-kpi-label">Gesamtkosten</span>
          <span className="fin-kpi-val">CHF {total.toFixed(2)}</span>
        </div>
        <div className="fin-kpi-card fin-kpi-paid">
          <span className="fin-kpi-label">Bezahlt</span>
          <span className="fin-kpi-val" style={{ color: "var(--success)" }}>CHF {paid.toFixed(2)}</span>
        </div>
        <div className="fin-kpi-card fin-kpi-open">
          <span className="fin-kpi-label">Offen</span>
          <span className="fin-kpi-val" style={{ color: open > 0 ? "var(--warning)" : "var(--text-muted)" }}>CHF {open.toFixed(2)}</span>
        </div>
        <div className="fin-kpi-card">
          <span className="fin-kpi-label">Personalumsatz</span>
          <span className="fin-kpi-val" style={{ color: "var(--accent)" }}>CHF {totalPersonnelRevenue.toFixed(0)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["invoices","personnel"] as const).map(t => (
          <button key={t} className={`wp-filter-btn ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}>
            {t === "invoices" ? "Rechnungen & Kosten" : "Personal & Technikerumsatz"}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <div className="fin-layout">
          {/* Left: bar chart + per-property */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div className="panel">
              <h3 className="panel-title" style={{ marginBottom: 16 }}>Kosten letzte 6 Monate</h3>
              <div className="fin-bar-chart">
                {monthly.map(m => (
                  <div key={m.label} className="fin-bar-col">
                    <span className="fin-bar-val">{m.sum > 0 ? `${m.sum.toFixed(0)}` : ""}</span>
                    <div className="fin-bar-track">
                      <div className="fin-bar-fill" style={{ height: `${(m.sum / maxBar) * 100}%` }} />
                    </div>
                    <span className="fin-bar-label">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <h3 className="panel-title" style={{ marginBottom: 14 }}>Kosten nach Objekt</h3>
              {Object.entries(byProp).length === 0
                ? <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Keine Daten</p>
                : Object.entries(byProp).sort((a, b) => b[1] - a[1]).map(([name, sum]) => (
                  <div key={name} className="fin-prop-row">
                    <span className="fin-prop-name">{name}</span>
                    <div className="fin-prop-bar-track">
                      <div className="fin-prop-bar" style={{ width: `${(sum / total) * 100}%` }} />
                    </div>
                    <span className="fin-prop-sum">CHF {sum.toFixed(0)}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Right: invoice table */}
          <div className="panel" style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 className="panel-title" style={{ margin: 0 }}>Rechnungen</h3>
              <div style={{ display: "flex", gap: 6 }}>
                {(["all","paid","open"] as const).map(f => (
                  <button key={f} className={`wp-filter-btn ${filter === f ? "active" : ""}`} style={{ fontSize: "0.75rem" }} onClick={() => setFilter(f)}>
                    {f === "all" ? "Alle" : f === "paid" ? "Bezahlt" : "Offen"}
                  </button>
                ))}
              </div>
            </div>
            {loading ? <p style={{ color: "var(--text-muted)" }}>Lädt…</p> : (
              <div className="fin-invoice-list">
                {visible.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Keine Rechnungen.</p>}
                {visible.map(inv => (
                  <div key={inv.ticketId} className="fin-invoice-row">
                    <div className="fin-invoice-left">
                      <span className="fin-invoice-title">{inv.ticketTitle}</span>
                      <span className="fin-invoice-meta">Ticket #{inv.ticketId} · {inv.date}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="fin-invoice-amount">CHF {inv.amount.toFixed(2)}</span>
                      <span className={`fin-badge ${inv.paid ? "fin-badge-paid" : "fin-badge-open"}`}>{inv.paid ? "✓ Bezahlt" : "Offen"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "personnel" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Technician revenue table */}
          <div className="panel">
            <h3 className="panel-title" style={{ marginBottom: 16 }}>Technikerumsatz (à CHF {HOURLY_RATE}.—/h)</h3>
            {techRows.length === 0
              ? <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Keine Daten — noch keine Tickets abgeschlossen.</p>
              : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "6px 16px", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, paddingBottom: 8, borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
                    <span>Techniker</span><span style={{ textAlign: "right" }}>Tickets</span><span style={{ textAlign: "right" }}>Stunden</span><span style={{ textAlign: "right" }}>Umsatz</span>
                  </div>
                  {techRows.map(r => (
                    <div key={r.name} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "6px 16px", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-subtle, var(--border))" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{r.name}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          <div className="fin-prop-bar-track" style={{ width: 120, display: "inline-block" }}>
                            <div className="fin-prop-bar" style={{ width: `${(r.revenue / totalPersonnelRevenue) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                      <span style={{ textAlign: "right", fontSize: "0.85rem", color: "var(--text-muted)" }}>{r.ticketCount}</span>
                      <span style={{ textAlign: "right", fontSize: "0.85rem", color: "var(--text-muted)" }}>{r.hours}h</span>
                      <span style={{ textAlign: "right", fontWeight: 700, fontSize: "0.9rem", color: "var(--accent)" }}>CHF {r.revenue.toFixed(0)}</span>
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "6px 16px", padding: "10px 0 0", fontWeight: 700, fontSize: "0.88rem" }}>
                    <span>Total</span>
                    <span style={{ textAlign: "right" }}>{techRows.reduce((s,r) => s + r.ticketCount, 0)}</span>
                    <span style={{ textAlign: "right" }}>{techRows.reduce((s,r) => s + r.hours, 0)}h</span>
                    <span style={{ textAlign: "right", color: "var(--accent)" }}>CHF {totalPersonnelRevenue.toFixed(0)}</span>
                  </div>
                </div>
              )
            }
          </div>

          {/* Personnel cost per property */}
          <div className="panel">
            <h3 className="panel-title" style={{ marginBottom: 14 }}>Personaleinsatz nach Objekt</h3>
            {propPersonnelRows.length === 0
              ? <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Keine Daten.</p>
              : propPersonnelRows.map(([name, cost]) => (
                <div key={name} className="fin-prop-row">
                  <span className="fin-prop-name">{name}</span>
                  <div className="fin-prop-bar-track">
                    <div className="fin-prop-bar" style={{ width: `${(cost / maxPropPersonnel) * 100}%`, background: "var(--warning)" }} />
                  </div>
                  <span className="fin-prop-sum">CHF {cost.toFixed(0)}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
