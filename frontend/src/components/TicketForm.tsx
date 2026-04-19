import { useEffect, useState, type FormEvent } from "react";
import { autoDetectPriority } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import type { TicketCreatePayload, TicketPriority, Tenant, Unit } from "../types";

interface Props {
  onCreate: (payload: TicketCreatePayload) => Promise<void> | void;
  units: Unit[];
  tenants: Tenant[];
}

export function TicketForm({ units, tenants, onCreate }: Props) {
  const { t } = useLanguage();
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [unitId, setUnitId]         = useState(units[0]?.id ?? 1);
  const [tenantId, setTenantId]     = useState<number | "">("");
  const [priority, setPriority]     = useState<TicketPriority | "">("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (units.length && !units.some((u) => u.id === unitId)) {
      setUnitId(units[0].id);
    }
  }, [units, unitId]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreate({
        title,
        description,
        unit_id: unitId,
        tenant_id: tenantId === "" ? undefined : tenantId,
        priority: priority === "" ? undefined : priority,
      });
      setTitle("");
      setDescription("");
      setTenantId("");
      setPriority("");
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = title.trim().length >= 3 && description.trim().length >= 5;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">{t("formTitle")}</h2>
      </div>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="form-label">
          {t("fieldTitle")}
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("fieldTitlePlaceholder")}
            required
            minLength={3}
          />
        </label>
        <label className="form-label">
          {t("fieldDesc")}
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("fieldDescPlaceholder")}
            required
            minLength={5}
          />
        </label>
        <label className="form-label">
          {t("fieldPriority")}{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{t("fieldPriorityHint")}</span>
          <select
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority | "")}
          >
            <option value="">{t("priorityAutoOption")}</option>
            <option value="HIGH">{t("priorityHighOption")}</option>
            <option value="MEDIUM">{t("priorityMediumOption")}</option>
            <option value="LOW">{t("priorityLowOption")}</option>
          </select>
          {priority === "" && (title.trim().length >= 3 || description.trim().length >= 5) && (() => {
            const detected = autoDetectPriority(title, description);
            const colors: Record<string, string> = { HIGH: "var(--danger)", MEDIUM: "var(--warning)", LOW: "var(--success)" };
            const labels: Record<string, string> = { HIGH: t("priorityHighOption"), MEDIUM: t("priorityMediumOption"), LOW: t("priorityLowOption") };
            return (
              <span style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: colors[detected] }}>
                🤖 {t("fieldPriorityHint")}: <strong>{labels[detected]}</strong>
              </span>
            );
          })()}
        </label>
        <label className="form-label">
          {t("fieldUnit")}
          <select
            name="unit_id"
            value={unitId}
            onChange={(e) => setUnitId(Number(e.target.value))}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {t("fieldFloor")} {u.floor}
              </option>
            ))}
          </select>
        </label>
        <label className="form-label">
          {t("fieldTenant")}{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{t("fieldTenantHint")}</span>
          <select
            name="tenant_id"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">{t("tenantNone")}</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name} — {tenant.email}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={!isValid || submitting}
        >
          {submitting ? t("submitCreating") : t("submitCreate")}
        </button>
      </form>
    </section>
  );
}
