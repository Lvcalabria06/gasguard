import type { RiskLevel } from "./risk-level";

export type EventPeriod = "last-hour" | "last-6h" | "today";

/** Client-side event list filters (chips + period). */
export interface EventFilterState {
  levels: RiskLevel[];
  period: EventPeriod;
}
