import { ArrowRight, History } from "lucide-react";

import { filterEvents } from "@/lib/filters";
import { getScenario } from "@/lib/scenarios";
import { cn } from "@/lib/utils";
import type { EventFilterState, ReportEvent, RiskLevel } from "@/types";

import { LEVEL_THEME } from "./level-theme";

export type EventRow = {
  id: string;
  time: string;
  fromLevel: RiskLevel | null;
  toLevel: RiskLevel;
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
  return level === null ? "—" : LEVEL_THEME[level].label;
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
    fromLevel: item.from,
    toLevel: item.to,
    fromLabel: levelLabel(item.from),
    toLabel: LEVEL_THEME[item.to].label,
    title: getScenario(item.scenarioId).title,
    toneClass: LEVEL_THEME[item.to].dotClass,
  }));
}

function LevelBadge({ level, label }: { level: RiskLevel | null; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ring-1 ring-inset",
        level ? LEVEL_THEME[level].badgeClass : "bg-muted text-muted-foreground ring-border",
      )}
    >
      {label}
    </span>
  );
}

export function EventList({
  events,
  filter,
}: {
  events: ReportEvent[];
  filter: EventFilterState;
}) {
  const rows = eventListView(events, filter, new Date());

  if (rows.length === 0) {
    return (
      <div className="grid h-44 place-items-center rounded-2xl border border-dashed text-center">
        <div className="space-y-2">
          <History aria-hidden className="mx-auto size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum evento neste período</p>
        </div>
      </div>
    );
  }

  return (
    <section aria-label="Eventos do dia">
      <p className="mb-2 text-xs text-muted-foreground tabular-nums">
        {rows.length === 1 ? "1 mudança de nível" : `${rows.length} mudanças de nível`}
      </p>
      <ol className="-mr-2 max-h-[26rem] overflow-y-auto overscroll-contain pr-2 [scrollbar-width:thin]">
        {rows.map((row, index) => (
          <li key={row.id} className="relative flex gap-3.5 pb-4 last:pb-1">
            {index < rows.length - 1 ? (
              <span
                aria-hidden
                className="absolute top-4 bottom-0 left-[0.3125rem] w-px bg-border"
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-card",
                row.toneClass,
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <LevelBadge level={row.fromLevel} label={row.fromLabel} />
                <ArrowRight aria-hidden className="size-3 text-muted-foreground" />
                <LevelBadge level={row.toLevel} label={row.toLabel} />
                <time
                  className="ml-auto text-xs text-muted-foreground tabular-nums"
                  dateTime={row.id}
                >
                  {row.time}
                </time>
              </div>
              <p className="mt-1 text-sm leading-snug text-foreground/85">{row.title}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
