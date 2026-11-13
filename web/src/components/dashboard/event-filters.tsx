import { RISK_LEVELS } from "@/lib/risk-level";
import { cn } from "@/lib/utils";
import type { EventFilterState, EventPeriod, RiskLevel } from "@/types";

const LEVEL_LABEL: Record<RiskLevel, string> = {
  NORMAL: "Normal",
  ATTENTION: "Atenção",
  ALERT: "Alerta",
  HIGH: "Alto",
  CRITICAL: "Crítico",
  FAILURE: "Falha",
};

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
      label: LEVEL_LABEL[id],
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

  return (
    <section aria-label="Filtros dos eventos" className="space-y-3">
      <h2 className="text-xs font-medium text-muted-foreground">{view.title}</h2>
      <div className="flex flex-wrap gap-1.5">
        {view.levels.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={chip.selected}
            onClick={() => onChange(toggleFilterLevel(value, chip.id))}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              chip.selected
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <div
        role="radiogroup"
        aria-label="Período"
        className="inline-flex rounded-full border border-border p-0.5"
      >
        {view.periods.map((chip) => (
          <button
            key={chip.id}
            type="button"
            role="radio"
            aria-checked={chip.selected}
            onClick={() => onChange(setFilterPeriod(value, chip.id))}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition-colors",
              chip.selected
                ? "bg-foreground text-background"
                : "text-muted-foreground",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </section>
  );
}
