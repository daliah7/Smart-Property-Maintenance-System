import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import type { Ticket } from "../types";

type StatusConfig = {
  labelKey: TranslationKey;
  icon: string;
  className: string;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  OPEN:        { labelKey: "statusOpen",        icon: "◎", className: "badge-open"     },
  ASSIGNED:    { labelKey: "statusAssigned",    icon: "◈", className: "badge-assigned"  },
  IN_PROGRESS: { labelKey: "statusInProgress",  icon: "◉", className: "badge-progress"  },
  RESOLVED:    { labelKey: "statusResolved",    icon: "✓", className: "badge-resolved"  },
  CLOSED:      { labelKey: "statusClosed",      icon: "⊘", className: "badge-closed"    },
};

export function StatusBadge({ status }: Pick<Ticket, "status">) {
  const { t } = useLanguage();
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.OPEN;
  return (
    <span className={`status-badge ${config.className}`}>
      <span aria-hidden="true">{config.icon}</span>
      {t(config.labelKey)}
    </span>
  );
}
