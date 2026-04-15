import { useEffect, useState } from "react";
import type { Property, Ticket } from "../types";
import { fetchInvoiceByTicket } from "../api";

interface InvoiceRow {
  ticketId: number;
  ticketTitle: string;
  amount: number;
  paid: boolean;
  date: string;
  property: string;
}

interface Props { tickets: Ticket[]; properties: Property[]; }

const MONTH_NAMES = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

export function FinanzenPage({ tickets, properties }: Props) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"all" | "paid" | "open">("all");

  useEffect(() => {
    setLoading(true);
    Promise.allSettled(
      tickets.map(t => fetchInvoiceByTicket(t.id).then(inv => ({ t, inv })))
    ).then(results => {
      const rows: InvoiceRow[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") {
          const { t, inv } = r.value;
          const prop = properties.find(p => p.id === t.unit_id) ?? null;
          rows.push({
            ticketId: t.id,
            ticketTitle: t.title,
            amount: Number(inv.amount),
            paid: inv.paid,
            date: inv.created_at ? String(inv.created_at).slice(0, 10) : "—",
            property: prop?.name ?? "Unbekannt",
          });
        }
      }
      setInvoices(rows);
      setLoading(false);
    });
  }, [tickets, properties]);

  const total   = invoices.reduce((s, i) => s + i.amount, 0);
  const paid    = invoices.filter(i => i.paid).reduce((s, i) => s + i.amount, 0);
  const open    = total - paid;
  const visible = invoices.filter(i => filter === "all" ? true : filter === "paid" ? i.paid : !i.paid);

  // Monthly totals for last 6 months
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const sum = invoices.filter(inv => inv.date.startsWith(key)).reduce((s, inv) => s + inv.amount, 0);
    return { label: MONTH_NAMES[d.getMonth()], sum };
  });
  const maxBar = Math.max(...monthly.map(m => m.sum), 1);

  // Cost per property
  const byProp: Record<string, number> = {};
  for (const inv of invoices) byProp[inv.property] = (byProp[inv.property] ?? 0) + inv.amount;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">⊠ Finanzen</h2>
          <p className="page-subtitle">Rechnungsübersicht, Kostenauswertung und offene Posten</p>
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
          <span className="fin-kpi-label">Rechnungen</span>
          <span className="fin-kpi-val">{invoices.length}</span>
        </div>
      </div>

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
    </div>
  );
}
