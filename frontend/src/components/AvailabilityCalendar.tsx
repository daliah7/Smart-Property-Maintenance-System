import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  selectedDates: string[]; // ISO date strings "YYYY-MM-DD"
  onChange: (dates: string[]) => void;
  disabled?: boolean;
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatChip(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date(iso + "T00:00:00"));
}

export function AvailabilityCalendar({ selectedDates, onChange, disabled }: Props) {
  const { t, lang } = useLanguage();
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Week starts Monday: Sunday=0 → 6, Mon=1→0 …
  const startDow = (firstDay.getDay() + 6) % 7;

  const monthLabel = new Intl.DateTimeFormat(
    lang === "de" ? "de-CH" : lang === "fr" ? "fr-CH" : lang === "it" ? "it-CH" : "en-GB",
    { month: "long", year: "numeric" }
  ).format(firstDay);

  const dayHeaders = [
    t("calMon"), t("calTue"), t("calWed"),
    t("calThu"), t("calFri"), t("calSat"), t("calSun"),
  ];

  const toggle = (iso: string) => {
    if (disabled) return;
    const past = new Date(iso + "T00:00:00") < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (past) return;
    onChange(
      selectedDates.includes(iso)
        ? selectedDates.filter(d => d !== iso)
        : [...selectedDates, iso].sort()
    );
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Build grid cells: nulls for empty leading cells
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const locale = lang === "de" ? "de-CH" : lang === "fr" ? "fr-CH" : lang === "it" ? "it-CH" : "en-GB";

  return (
    <div className={`avail-cal ${disabled ? "avail-cal-disabled" : ""}`}>
      {/* Month navigation */}
      <div className="avail-cal-nav">
        <button type="button" className="avail-cal-arrow" onClick={prevMonth} disabled={disabled}>
          {t("calPrev")}
        </button>
        <span className="avail-cal-month">{monthLabel}</span>
        <button type="button" className="avail-cal-arrow" onClick={nextMonth} disabled={disabled}>
          {t("calNext")}
        </button>
      </div>

      {/* Day headers */}
      <div className="avail-cal-grid">
        {dayHeaders.map(d => (
          <div key={d} className="avail-cal-header">{d}</div>
        ))}

        {/* Day cells */}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e${idx}`} />;
          const iso = isoDate(viewYear, viewMonth, day);
          const isSelected = selectedDates.includes(iso);
          const isPast = new Date(iso + "T00:00:00") < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isToday = iso === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
          return (
            <button
              key={iso}
              type="button"
              className={[
                "avail-cal-day",
                isSelected ? "avail-day-selected" : "",
                isPast ? "avail-day-past" : "",
                isToday ? "avail-day-today" : "",
              ].join(" ")}
              onClick={() => toggle(iso)}
              disabled={disabled || isPast}
              title={iso}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Selected chips */}
      {selectedDates.length > 0 && (
        <div className="avail-chips">
          {selectedDates.map(d => (
            <span key={d} className="avail-chip">
              {formatChip(d, locale)}
              {!disabled && (
                <button type="button" className="avail-chip-remove" onClick={() => toggle(d)}>×</button>
              )}
            </span>
          ))}
          {!disabled && (
            <button type="button" className="avail-chips-clear" onClick={() => onChange([])}>
              {t("portalAvailabilityClear")}
            </button>
          )}
        </div>
      )}
      {selectedDates.length === 0 && (
        <p className="avail-empty">{t("portalAvailabilityNone")}</p>
      )}
    </div>
  );
}
