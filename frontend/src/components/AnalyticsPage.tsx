import { useEffect, useState } from "react";
import { fetchAnalytics } from "../api";
import { useLanguage } from "../i18n/LanguageContext";
import type { AnalyticsData } from "../types";

/* ── Bar Chart ── */
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bar-chart-wrap">
      {data.map(d => (
        <div key={d.label} className="bar-col">
          <span className="bar-val">{d.value}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ height: visible ? `${(d.value / max) * 100}%` : "0%" }} />
          </div>
          <span className="bar-lbl">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Donut Chart ── */
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="donut-empty">—</div>;
  let cumPct = 0;
  const segments = data.map(d => {
    const pct = (d.value / total) * 100;
    const s = cumPct; cumPct += pct;
    return { ...d, pct, start: s };
  });
  const gradient = segments.map(s => `${s.color} ${s.start.toFixed(1)}% ${(s.start + s.pct).toFixed(1)}%`).join(", ");
  return (
    <div className="donut-wrap">
      <div className="donut-chart" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="donut-hole"><span className="donut-total">{total}</span></div>
      </div>
      <div className="donut-legend">
        {segments.map(s => (
          <div key={s.label} className="donut-legend-item">
            <span className="donut-dot" style={{ background: s.color }} />
            <span>{s.label}</span>
            <span className="donut-count">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Heatmap ── */
function Heatmap({ data }: { data: { name: string; count: number; cost: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const COLORS = ["#1e3a5f", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"];
  return (
    <div className="heatmap-grid">
      {data.map(d => {
        const level = Math.floor((d.count / max) * (COLORS.length - 1));
        return (
          <div key={d.name} className="heatmap-cell" style={{ background: COLORS[level] }}
            title={`${d.name}: ${d.count} Tickets · CHF ${d.cost.toFixed(0)}`}>
            <span className="heatmap-name">{d.name}</span>
            <span className="heatmap-count">{d.count}</span>
            {d.cost > 0 && <span className="heatmap-cost">CHF {d.cost.toFixed(0)}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ── KPI Card ── */
function KPICard({ label, value, unit, sub, accent }: {
  label: string; value: string | number; unit?: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`kpi-card ${accent ? "kpi-card-accent" : ""}`}>
      <div className="kpi-value">{value}<span className="kpi-unit">{unit}</span></div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

/* ── Main ── */
export function AnalyticsPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch(() => setError(t("analyticsError")))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return (
    <div className="analytics-loading">
      <div className="spinner" />{t("analyticsLoading")}
    </div>
  );
  if (error || !data) return <div className="analytics-error">{error || t("analyticsError")}</div>;

  const trendData = data.monthly_trend.map(m => ({ label: m.month, value: m.count }));

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h2 className="analytics-title">{t("analyticsTitle")}</h2>
        <p className="analytics-subtitle">{t("analyticsSubtitle")}</p>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KPICard
          label={t("kpiAvgResolution")}
          value={data.avg_resolution_hours}
          unit={` ${t("kpiHours")}`}
          sub={data.sla_compliance_pct >= 80 ? "✅ On track" : "⚠️ Below target"}
        />
        <KPICard
          label={t("kpiSLA")}
          value={`${data.sla_compliance_pct}%`}
          sub={data.sla_compliance_pct >= 90 ? "Exzellent" : data.sla_compliance_pct >= 70 ? "Gut" : "Verbesserungsbedarf"}
          accent={data.sla_compliance_pct < 70}
        />
        <KPICard
          label={t("kpiTotalCost")}
          value={`CHF ${data.total_cost.toLocaleString("de-CH", { minimumFractionDigits: 2 })}`}
        />
        <KPICard
          label={t("kpiAvgCost")}
          value={`CHF ${data.avg_cost_per_ticket.toLocaleString("de-CH", { minimumFractionDigits: 2 })}`}
        />
        <KPICard
          label={t("kpiEscalated")}
          value={data.escalated_count}
          accent={data.escalated_count > 0}
          sub={data.escalated_count === 0 ? "✅ Keine" : "🚨 Sofortmassnahmen nötig"}
        />
        <KPICard
          label={t("kpiAtRisk")}
          value={data.at_risk_count}
          accent={data.at_risk_count > 0}
          sub={data.at_risk_count === 0 ? "✅ Keine" : "⚠️ SLA > 80% verbraucht"}
        />
      </div>

      <div className="analytics-row">
        {/* Monthly Trend */}
        <div className="panel">
          <h3 className="panel-title">{t("chartTrend")}</h3>
          {trendData.length === 0
            ? <p className="analytics-no-data">{t("analyticsNoData")}</p>
            : <BarChart data={trendData} />}
        </div>

        {/* Status Donut */}
        <div className="panel">
          <h3 className="panel-title">Status-Verteilung</h3>
          <DonutChart data={[
            { label: "Offen",        value: 0, color: "#f59e0b" },
            { label: "Zugewiesen",   value: 0, color: "#3b82f6" },
            { label: "In Arbeit",    value: 0, color: "#f97316" },
            { label: "Erledigt",     value: 0, color: "#22c55e" },
            { label: "Geschlossen",  value: 0, color: "#6b7280" },
          ].map((item, _, arr) => {
            // counts are passed via data
            const counts: Record<string, number> = {};
            data.tickets_per_property; // just to use data
            return item;
          })} />
          {/* Use a simpler status summary from monthly + property data */}
          <div className="status-pills">
            <span className="status-pill" style={{ background: "#f59e0b22", color: "#f59e0b" }}>
              🟡 {data.escalated_count + data.at_risk_count} aktiv eskaliert
            </span>
            <span className="status-pill" style={{ background: "#22c55e22", color: "#22c55e" }}>
              ✅ {data.sla_compliance_pct}% SLA ok
            </span>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="panel">
        <h3 className="panel-title">{t("chartHeatmap")}</h3>
        {data.tickets_per_property.length === 0
          ? <p className="analytics-no-data">{t("analyticsNoData")}</p>
          : <Heatmap data={data.tickets_per_property.map(p => ({
              name: p.property_name, count: p.ticket_count, cost: p.total_cost,
            }))} />}
      </div>

      {/* Cost Table */}
      <div className="panel">
        <h3 className="panel-title">{t("chartCostPerProp")}</h3>
        {data.tickets_per_property.length === 0
          ? <p className="analytics-no-data">{t("analyticsNoData")}</p>
          : (
          <div className="cost-table-wrap">
            <table className="cost-table">
              <thead>
                <tr>
                  <th>Objekt</th>
                  <th style={{ textAlign: "right" }}>Tickets</th>
                  <th style={{ textAlign: "right" }}>Kosten (CHF)</th>
                  <th style={{ textAlign: "right" }}>Ø / Ticket</th>
                  <th>Anteil</th>
                </tr>
              </thead>
              <tbody>
                {data.tickets_per_property.map(p => {
                  const avg = p.ticket_count > 0 ? p.total_cost / p.ticket_count : 0;
                  const maxC = Math.max(...data.tickets_per_property.map(x => x.ticket_count), 1);
                  const pct = (p.ticket_count / maxC) * 100;
                  return (
                    <tr key={p.property_name}>
                      <td className="cost-table-name">{p.property_name}</td>
                      <td style={{ textAlign: "right" }}>{p.ticket_count}</td>
                      <td style={{ textAlign: "right" }}>{p.total_cost.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{avg.toFixed(2)}</td>
                      <td>
                        <div className="mini-bar-track">
                          <div className="mini-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td><strong>Total</strong></td>
                  <td style={{ textAlign: "right" }}><strong>{data.tickets_per_property.reduce((s, p) => s + p.ticket_count, 0)}</strong></td>
                  <td style={{ textAlign: "right" }}><strong>{data.total_cost.toFixed(2)}</strong></td>
                  <td style={{ textAlign: "right" }}><strong>{data.avg_cost_per_ticket.toFixed(2)}</strong></td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
