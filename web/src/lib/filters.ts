import type { EventFilterState, EventPeriod, ReportEvent, RiskLevel } from "@/types";

import { parseLocalIso } from "./format";

const HOUR_MS = 60 * 60 * 1000;

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function matchesLevel(event: ReportEvent, levels: RiskLevel[]): boolean {
  return levels.length === 0 || levels.includes(event.to);
}

function matchesPeriod(event: ReportEvent, period: EventPeriod, now: Date): boolean {
  const at = parseLocalIso(event.timestamp);
  if (!at) return false;
  if (period === "today") return localDateKey(at) === localDateKey(now);
  const windowMs = period === "last-hour" ? HOUR_MS : 6 * HOUR_MS;
  return at.getTime() >= now.getTime() - windowMs;
}

export function filterEvents(
  events: ReportEvent[],
  filter: EventFilterState,
  now: Date,
): ReportEvent[] {
  return events.filter(
    (event) => matchesLevel(event, filter.levels) && matchesPeriod(event, filter.period, now),
  );
}
