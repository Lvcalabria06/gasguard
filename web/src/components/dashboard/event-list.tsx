import { filterEvents } from "@/lib/filters";
import { getScenario } from "@/lib/scenarios";
import { cn } from "@/lib/utils";
import type { EventFilterState, ReportEvent, RiskLevel } from "@/types";

const LEVEL_LABEL: Record<RiskLevel, string> = {
  NORMAL: "Normal",
  ATTENTION: "Atenção",
  ALERT: "Alerta",
  HIGH: "Alto",
  CRITICAL: "Crítico",
  FAILURE: "Falha",
};

const TONE: Record<RiskLevel, string> = {
  NORMAL: "bg-emerald-600",
  ATTENTION: "bg-amber-400",
  ALERT: "bg-orange-500",
  HIGH: "bg-red-600",
  CRITICAL: "bg-red-900",
  FAILURE: "bg-zinc-500",
};

export type EventRow = {
  id: string;
  time: string;
  fromLabel: string;
  toLabel: string;
  title: string;
  toneClass: string;
};

function eventTime(timestamp: string): string {
  const [, time] = timestamp.split("T");
  return time ?? timestamp;
}

function levelLabel(level: RiskLevel | null): string {
  return level === null ? "—" : LEVEL_LABEL[level];
}

export function eventListView(
  events: ReportEvent[],
  filter: EventFilterState,
  now: Date,
): EventRow[] {
  const filtered = filterEvents(events, filter, now);
  const newestFirst = filtered.slice().reverse();
  return newestFirst.map((item) => ({
    id: item.id,
    time: eventTime(item.timestamp),
    fromLabel: levelLabel(item.from),
    toLabel: LEVEL_LABEL[item.to],
    title: getScenario(item.scenarioId).title,
    toneClass: TONE[item.to],
  }));
}

export function EventList({
  events,
  filter,
}: {
  events: ReportEvent[];
  filter: EventFilterState;
}) {
  const rows = eventListView(events, filter, new Date());

  return (
    <section
      aria-label="Eventos do dia"
      className="overflow-hidden rounded-2xl border bg-card"
    >
      {rows.length === 0 ? (
        <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          —
        </p>
      ) : (
        <ul className="max-h-64 overflow-y-auto overscroll-contain">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  row.toneClass,
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <time
                    className="tabular-nums text-muted-foreground"
                    dateTime={row.id}
                  >
                    {row.time}
                  </time>
                  <span>
                    {row.fromLabel} → {row.toLabel}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {row.title}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
