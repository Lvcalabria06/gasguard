import type { Reading } from "./reading";
import type { ReportEvent } from "./report-event";

/** Initial payload for the home Server Component and `useReadings`. */
export interface RecentReadings {
  date: string;
  readings: Reading[];
  events: ReportEvent[];
}
