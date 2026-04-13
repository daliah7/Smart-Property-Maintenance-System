import { useLanguage } from "../i18n/LanguageContext";
import type { Property, Unit, Tenant, Ticket } from "../types";

interface Props {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  tickets: Ticket[];
}

export function PropertiesPage({ properties, units, tenants, tickets }: Props) {
  const { t } = useLanguage();

  if (properties.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "60px 0" }}>
        <div className="empty-state-icon">🏢</div>
        <div className="empty-state-text">{t("propNoProperties")}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">{t("propPageTitle")}</h2>
        <p className="page-sub">{t("propPageSub")}</p>
      </div>

      <div className="prop-grid">
        {properties.map(prop => {
          const propUnits = units.filter(u => u.property_id === prop.id);
          const propTicketCount = tickets.filter(tk =>
            propUnits.some(u => u.id === tk.unit_id)
          ).length;
          const openCount = tickets.filter(tk =>
            propUnits.some(u => u.id === tk.unit_id) && tk.status === "OPEN"
          ).length;

          return (
            <div key={prop.id} className="prop-card panel">
              <div className="prop-card-header">
                <div>
                  <div className="prop-card-name">{prop.name}</div>
                  <div className="prop-card-address">{prop.address}</div>
                </div>
                <div className="prop-card-badges">
                  <span className="chip">{propUnits.length} {t("propUnit")}{propUnits.length !== 1 ? "s" : ""}</span>
                  {openCount > 0 && (
                    <span className="chip chip-warn">{openCount} offen</span>
                  )}
                </div>
              </div>

              <div className="prop-units">
                {propUnits.map(unit => {
                  const tenant = tenants.find(tn => tn.unit_id === unit.id);
                  const unitTickets = tickets.filter(tk => tk.unit_id === unit.id);
                  const unitOpen = unitTickets.filter(tk => tk.status === "OPEN" || tk.status === "ASSIGNED" || tk.status === "IN_PROGRESS").length;

                  return (
                    <div key={unit.id} className="unit-row">
                      <div className="unit-row-left">
                        <span className="unit-badge">{unit.name}</span>
                        <span className="unit-floor">{t("propFloor")} {unit.floor}</span>
                      </div>
                      <div className="unit-row-mid">
                        {tenant ? (
                          <div className="unit-tenant">
                            <span className="unit-tenant-name">{tenant.name}</span>
                            <span className="unit-tenant-email">{tenant.email}</span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{t("propNoTenant")}</span>
                        )}
                      </div>
                      <div className="unit-row-right">
                        {unitOpen > 0 && (
                          <span className="chip chip-warn" style={{ fontSize: "0.72rem" }}>
                            {unitOpen} offen
                          </span>
                        )}
                        {unitTickets.length > 0 && unitOpen === 0 && (
                          <span className="chip" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {unitTickets.length} Ticket{unitTickets.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 16 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Tickets gesamt: <strong style={{ color: "var(--text-secondary)" }}>{propTicketCount}</strong>
                </span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Mieter: <strong style={{ color: "var(--text-secondary)" }}>{tenants.filter(tn => propUnits.some(u => u.id === tn.unit_id)).length}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
