import type { Reading } from "./reading";
import type { ReportEvent } from "./report-event";

/** Initial payload for the home Server Component and `useReadings`. */
export interface RecentReadings {
  date: string;
  readings: Reading[];
  events: ReportEvent[];
  /**
   * Age of the last reading in ms, measured by the server (same clock that stamped `hora`).
   * The browser uses it instead of its own clock, which may differ from the PC's.
   * Absent or null: no readings, or an older payload (the hook falls back to the timestamp).
   */
  lastReadingAgeMs?: number | null;
}
