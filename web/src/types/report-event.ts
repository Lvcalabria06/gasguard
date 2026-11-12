import type { ReadingSource } from "./reading";
import type { RiskLevel } from "./risk-level";

/** A change of risk level between two consecutive readings. */
export interface ReportEvent {
  /** Stable id: the timestamp of the reading that changed the level. */
  id: string;
  timestamp: string;
  /** null for the first reading of the day. */
  from: RiskLevel | null;
  to: RiskLevel;
  scenarioId: number;
  source: ReadingSource;
}
