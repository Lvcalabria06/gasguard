import { RISK_LEVELS } from "@/lib/risk-level";
import { cn } from "@/lib/utils";
import type { EventFilterState, EventPeriod, RiskLevel } from "@/types";

import { LEVEL_THEME } from "./level-theme";

const PERIODS: { id: EventPeriod; label: string }[] = [
  { id: "last-hour", label: "Última hora" },
  { id: "last-6h", label: "Últimas 6 h" },
  { id: "today", label: "Hoje" },
];

export const DEFAULT_EVENT_FILTER: EventFilterState = {
  levels: [],
  period: "today",
};

export function filterView(value: EventFilterState) {
  return {
    title: "Eventos do dia" as const,
    levels: RISK_LEVELS.map((id) => ({
      id,
      label: LEVEL_THEME[id].label,
      selected: value.levels.includes(id),
    })),
    periods: PERIODS.map((period) => ({
      ...period,
      selected: value.period === period.id,
    })),
  };
}

export function toggleFilterLevel(
  value: EventFilterState,
  level: RiskLevel,
): EventFilterState {
  const selected = new Set(value.levels);
  if (selected.has(level)) {
    selected.delete(level);
  } else {
    selected.add(level);
  }
  return {
    ...value,
    levels: RISK_LEVELS.filter((item) => selected.has(item)),
  };
}

export function setFilterPeriod(
  value: EventFilterState,
  period: EventPeriod,
): EventFilterState {
  return { ...value, period };
}

export function EventFilters({
  value,
  onChange,
}: {
  value: EventFilterState;
  onChange: (next: EventFilterState) => void;
}) {
  const view = filterView(value);
  const anySelected = value.levels.length > 0;

  return (
    <div aria-label="Filtros dos eventos" role="group" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="eyebrow">{view.title}</h2>
        <div
          role="radiogroup"
          aria-label="Período"
          className="inline-flex rounded-full bg-muted p-0.5"
        >
          {view.periods.map((chip) => (
            <button
              key={chip.id}
              type="button"
              role="radio"
              aria-checked={chip.selected}
              onClick={() => onChange(setFilterPeriod(value, chip.id))}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-all",
                chip.selected
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {view.levels.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={chip.selected}
            onClick={() => onChange(toggleFilterLevel(value, chip.id))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
              chip.selected
                ? "border-foreground/80 bg-foreground text-background"
                : "bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              anySelected && !chip.selected && "opacity-70",
            )}
          >
            <span
              aria-hidden
              className={cn("size-1.5 rounded-full", LEVEL_THEME[chip.id].dotClass)}
            />
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
