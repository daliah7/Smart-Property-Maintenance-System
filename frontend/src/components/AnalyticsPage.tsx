import { useEffect, useState } from "react";
import { fetchAnalytics } from "../api";
import { useLanguage } from "../i18n/LanguageContext";
import type { AnalyticsData, Ticket } from "../types";

/* ─── SVG Area/Line Trend Chart ─── */
function TrendChart({ data }: { data: { label: string; value: number }[] }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t); }, []);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);

  if (data.length === 0) return <p className="analytics-no-data">Keine Daten</p>;

  const W = 560; const H = 160; const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const pts = data.map((d, i) => ({
    x: PAD.left + (i / Math.max(data.length - 1, 1)) * iW,
    y: PAD.top + (1 - d.value / maxV) * iH,
    ...d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + iH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD.top + iH).toFixed(1)} Z`;

  // y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    v: Math.round(maxV * f),
    y: PAD.top + (1 - f) * iH,
  }));

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="trendClip">
            <rect x={PAD.left} y={PAD.top} width={visible ? iW : 0} height={iH} style={{ transition: "width 0.8s ease" }} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {yTicks.map(tick => (
          <g key={tick.v}>
            <line x1={PAD.left} x2={PAD.left + iW} y1={tick.y} y2={tick.y} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={PAD.left - 6} y={tick.y + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{tick.v}</text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" clipPath="url(#trendClip)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" clipPath="url(#trendClip)" />

        {/* X labels */}
        {pts.map((p, i) => (
          <text key={i} x={p.x} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{p.label}</text>
        ))}

        {/* Dots + hover targets */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--accent)" stroke="var(--bg-panel)" strokeWidth="2"
              style={{ opacity: visible ? 1 : 0, transition: `opacity 0.5s ${i * 0.06}s` }} />
            <circle cx={p.x} cy={p.y} r="14" fill="transparent"
              onMouseEnter={() => setTooltip({ x: p.x, y: p.y, label: p.label, value: p.value })}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: "default" }} />
          </g>
        ))}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect x={tooltip.x - 32} y={tooltip.y - 36} width={64} height={26} rx="5"
              fill="var(--bg-tooltip, #1a2133)" stroke="var(--border)" strokeWidth="1" />
            <text x={tooltip.x} y={tooltip.y - 18} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--accent)">{tooltip.value}</text>
            <text x={tooltip.x} y={tooltip.y - 8} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{tooltip.label}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

/* ─── Donut Chart with real ticket data ─── */
const STATUS_COLORS: Record<string, { label: string; color: string }> = {
  OPEN:        { label: "Offen",          color: "#638bff" },
  ASSIGNED:    { label: "Zugewiesen",     color: "#b57bee" },
  IN_PROGRESS: { label: "In Bearbeitung", color: "#f5a623" },
  RESOLVED:    { label: "Gelöst",         color: "#3ecf8e" },
  CLOSED:      { label: "Geschlossen",    color: "#525d6e" },
};

function StatusDonut({ tickets }: { tickets: Ticket[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const counts = Object.fromEntries(
    Object.keys(STATUS_COLORS).map(s => [s, tickets.filter(t => t.status === s).length])
  );
  const total = tickets.length;

  const R = 70; const STROKE = 20; const GAP = 2;
  const circ = 2 * Math.PI * R;

  type Seg = { key: string; count: number; color: string; label: string; offset: number; dash: number };
  const segs: Seg[] = [];
  let off = 0;
  for (const [key, meta] of Object.entries(STATUS_COLORS)) {
    const count = counts[key] ?? 0;
    if (count === 0) continue;
    const dash = (count / total) * circ - GAP;
    segs.push({ key, count, color: meta.color, label: meta.label, offset: off, dash });
    off += (count / total) * circ;
  }

  const hSeg = hovered ? segs.find(s => s.key === hovered) : null;

  if (total === 0) return <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Keine Tickets.</p>;

  return (
    <div className="status-donut-wrap">
      <svg width={170} height={170} viewBox="0 0 170 170">
        <g transform="rotate(-90 85 85)">
          {segs.map(seg => {
            const isHov = hovered === seg.key;
            const r = isHov ? R + 4 : R;
            const c2 = 2 * Math.PI * r;
            const dashVal = (seg.count / total) * c2 - GAP;
            const offsetVal = (seg.offset / circ) * c2;
            return (
              <circle key={seg.key}
                cx={85} cy={85} r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={isHov ? STROKE + 4 : STROKE}
                strokeDasharray={`${dashVal} ${c2}`}
                strokeDashoffset={-offsetVal}
                style={{ transition: "all 0.2s", opacity: hovered && !isHov ? 0.35 : 1, cursor: "pointer" }}
                onMouseEnter={() => setHovered(seg.key)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </g>
        {/* Center label */}
        <text x={85} y={80} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text-primary)">
          {hSeg ? hSeg.count : total}
        </text>
        <text x={85} y={98} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
          {hSeg ? hSeg.label : "Tickets"}
        </text>
      </svg>

      {/* Legend */}
      <div className="status-donut-legend">
        {segs.map(seg => (
          <div key={seg.key} className="donut-legend-item"
            style={{ opacity: hovered && hovered !== seg.key ? 0.45 : 1, cursor: "default", transition: "opacity 0.2s" }}
            onMouseEnter={() => setHovered(seg.key)}
            onMouseLeave={() => setHovered(null)}>
            <span className="donut-dot" style={{ background: seg.color }} />
            <span style={{ flex: 1, fontSize: "0.82rem" }}>{seg.label}</span>
            <span style={{ fontWeight: 700, fontSize: "0.82rem", color: seg.color }}>{seg.count}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: 4 }}>
              ({Math.round((seg.count / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Heatmap ─── */
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

/* ─── KPI Card ─── */
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

/* ─── Main ─── */
interface Props { tickets: Ticket[] }

export function AnalyticsPage({ tickets }: Props) {
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

  const trendData = data.monthly_trend.map(m => ({ label: m.month.slice(5), value: m.count }));

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h2 className="analytics-title">{t("analyticsTitle")}</h2>
        <p className="analytics-subtitle">{t("analyticsSubtitle")}</p>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KPICard label={t("kpiAvgResolution")} value={data.avg_resolution_hours} unit={` ${t("kpiHours")}`}
          sub={data.sla_compliance_pct >= 80 ? "✅ On track" : "⚠️ Below target"} />
        <KPICard label={t("kpiSLA")} value={`${data.sla_compliance_pct}%`}
          sub={data.sla_compliance_pct >= 90 ? "Exzellent" : data.sla_compliance_pct >= 70 ? "Gut" : "Verbesserungsbedarf"}
          accent={data.sla_compliance_pct < 70} />
        <KPICard label={t("kpiTotalCost")} value={`CHF ${data.total_cost.toLocaleString("de-CH", { minimumFractionDigits: 2 })}`} />
        <KPICard label={t("kpiAvgCost")} value={`CHF ${data.avg_cost_per_ticket.toLocaleString("de-CH", { minimumFractionDigits: 2 })}`} />
        <KPICard label={t("kpiEscalated")} value={data.escalated_count} accent={data.escalated_count > 0}
          sub={data.escalated_count === 0 ? "✅ Keine" : "🚨 Sofortmassnahmen nötig"} />
        <KPICard label={t("kpiAtRisk")} value={data.at_risk_count} accent={data.at_risk_count > 0}
          sub={data.at_risk_count === 0 ? "✅ Keine" : "⚠️ SLA > 80% verbraucht"} />
      </div>

      <div className="analytics-row">
        {/* Monthly Trend — SVG line chart */}
        <div className="panel">
          <h3 className="panel-title">{t("chartTrend")}</h3>
          <TrendChart data={trendData} />
        </div>

        {/* Status Donut — real ticket data */}
        <div className="panel" style={{ minWidth: 0 }}>
          <h3 className="panel-title">Status-Verteilung</h3>
          <StatusDonut tickets={tickets} />
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
