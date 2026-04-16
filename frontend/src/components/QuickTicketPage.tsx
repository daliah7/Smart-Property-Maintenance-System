import { useState } from "react";
import { createTicket } from "../api";
import type { Tenant, Unit, Ticket } from "../types";

interface Props {
  tenants: Tenant[];
  units: Unit[];
  tickets: Ticket[];
  onTicketCreated: () => void;
}

const PRIORITY_META = {
  HIGH:   { label: "Hoch — sofort handeln",      color: "var(--danger)"  },
  MEDIUM: { label: "Mittel — baldige Behebung",  color: "var(--warning)" },
  LOW:    { label: "Niedrig — kein Eilverzug",   color: "var(--success)" },
};

export function QuickTicketPage({ tenants, units, tickets, onTicketCreated }: Props) {
  const [tenantId, setTenantId]     = useState<number>(0);
  const [title, setTitle]           = useState("");
  const [desc, setDesc]             = useState("");
  const [priority, setPriority]     = useState<"HIGH"|"MEDIUM"|"LOW">("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState<number | null>(null);

  const selectedTenant = tenants.find(t => t.id === tenantId) ?? null;
  const tenantUnit     = selectedTenant ? units.find(u => u.id === selectedTenant.unit_id) : null;

  // Recent tickets for selected tenant
  const recentTickets = selectedTenant
    ? tickets
        .filter(tk => tk.unit_id === selectedTenant.unit_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !title.trim() || !desc.trim()) return;
    setSubmitting(true);
    try {
      const created = await createTicket({
        title: title.trim(),
        description: desc.trim(),
        unit_id: selectedTenant!.unit_id,
        reporter_name: selectedTenant!.name,
        priority,
      });
      setSuccess((created as { id: number }).id ?? 0);
      setTitle(""); setDesc(""); setPriority("MEDIUM");
      onTicketCreated();
      setTimeout(() => setSuccess(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && !!tenantId && !!title.trim() && !!desc.trim();

  const statusColor: Record<string, string> = {
    OPEN: "var(--accent)", ASSIGNED: "var(--warning)", IN_PROGRESS: "var(--warning)",
    RESOLVED: "var(--success)", CLOSED: "var(--text-muted)",
  };
  const statusLabel: Record<string, string> = {
    OPEN: "Offen", ASSIGNED: "Zugeteilt", IN_PROGRESS: "In Bearbeitung",
    RESOLVED: "Gelöst", CLOSED: "Abgeschlossen",
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">⌂ Ticket-Erfassung</h2>
          <p className="page-subtitle">Telefonische Meldung aufnehmen und direkt als Ticket erfassen</p>
        </div>
      </div>

      <div className="qt-layout">
        {/* Left: form */}
        <div className="qt-form-col">
          <div className="panel">
            <h3 className="panel-title" style={{ marginBottom: 18 }}>Neue Meldung erfassen</h3>

            {success && (
              <div className="portal-success" style={{ marginBottom: 16 }}>
                ✓ Ticket #{success} wurde erfolgreich erstellt und weitergeleitet.
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Tenant selector */}
              <label className="form-label">
                Mieter <span className="form-required">*</span>
                <select value={tenantId} onChange={e => setTenantId(Number(e.target.value))}>
                  <option value={0}>— Mieter auswählen —</option>
                  {tenants.map(t => {
                    const u = units.find(u => u.id === t.unit_id);
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name}{u ? ` · ${u.name}` : ""} (ID {t.id})
                      </option>
                    );
                  })}
                </select>
              </label>

              {/* Unit info (auto-filled) */}
              {selectedTenant && tenantUnit && (
                <div className="qt-tenant-info">
                  <div className="qt-tenant-row">
                    <span className="qt-tenant-icon">◉</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{selectedTenant.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {tenantUnit.name} · {tenantUnit.floor} · Mieter-ID {selectedTenant.id}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Priority */}
              <label className="form-label">Priorität</label>
              <div className="qt-priority-row">
                {(["HIGH","MEDIUM","LOW"] as const).map(p => (
                  <button
                    key={p} type="button"
                    className={`qt-priority-btn ${priority === p ? "active" : ""}`}
                    style={priority === p ? { borderColor: PRIORITY_META[p].color, color: PRIORITY_META[p].color, background: PRIORITY_META[p].color + "18" } : {}}
                    onClick={() => setPriority(p)}
                  >
                    <span style={{ fontWeight: 700 }}>{p === "HIGH" ? "Hoch" : p === "MEDIUM" ? "Mittel" : "Niedrig"}</span>
                    <span style={{ fontSize: "0.7rem", opacity: 0.75 }}>{p === "HIGH" ? "sofort" : p === "MEDIUM" ? "bald" : "normal"}</span>
                  </button>
                ))}
              </div>

              {/* Title */}
              <label className="form-label">
                Titel / Kurzinfo <span className="form-required">*</span>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="z.B. Heizung ausgefallen, Wasserhahn tropft…"
                  disabled={!tenantId}
                  required
                />
              </label>

              {/* Description */}
              <label className="form-label">
                Beschreibung <span className="form-required">*</span>
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder={tenantId ? "Details der telefonischen Meldung…" : "Bitte zuerst einen Mieter auswählen"}
                  rows={5}
                  disabled={!tenantId}
                  required
                />
              </label>

              <button type="submit" className="btn btn-primary btn-full" disabled={!canSubmit}>
                {submitting ? "Wird erstellt…" : "✓ Ticket erstellen"}
              </button>
            </form>
          </div>
        </div>

        {/* Right: tenant overview + recent tickets */}
        <div className="qt-info-col">
          {!selectedTenant ? (
            <div className="panel" style={{ textAlign: "center", padding: "32px 24px" }}>
              <div style={{ fontSize: "2rem", opacity: 0.3, marginBottom: 12 }}>◉</div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Mieter auswählen um Verlauf und Wohnungsdetails zu sehen.
              </p>
            </div>
          ) : (
            <>
              {/* Tenant card */}
              <div className="panel">
                <h4 className="panel-title" style={{ marginBottom: 14 }}>Mieter-Übersicht</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    ["Name",       selectedTenant.name],
                    ["Mieter-ID",  String(selectedTenant.id)],
                    ["Einheit",    tenantUnit?.name ?? "—"],
                    ["Stockwerk",  tenantUnit?.floor ?? "—"],
                    ["Offene Tickets", String(recentTickets.filter(t => t.status === "OPEN" || t.status === "ASSIGNED" || t.status === "IN_PROGRESS").length)],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                      <span style={{ color: "var(--text-muted)" }}>{k}</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent tickets */}
              <div className="panel">
                <h4 className="panel-title" style={{ marginBottom: 14 }}>Letzte Tickets dieser Wohnung</h4>
                {recentTickets.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Noch keine Tickets.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {recentTickets.map(tk => (
                      <div key={tk.id} style={{ padding: "10px 12px", background: "var(--bg-input)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.title}</span>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: statusColor[tk.status] ?? "var(--text-muted)", whiteSpace: "nowrap" }}>
                            {statusLabel[tk.status] ?? tk.status}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          #{tk.id} · {new Date(tk.created_at).toLocaleDateString("de-CH")} · {tk.priority}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
