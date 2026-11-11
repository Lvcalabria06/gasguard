import type { RiskLevel } from "./risk-level";

export type ReadingSource = "board" | "mock";

/** 0 = normal, 1 = attention, 2 = leak (firmware thresholds). */
export type GasLevel = 0 | 1 | 2;

export interface GasSensorReading {
  value: number;
  base: number;
  level: GasLevel;
}

export interface TemperatureReading {
  /** null when the DHT11 reading was invalid. */
  celsius: number | null;
  /** null while the firmware has no ambient baseline yet. */
  limit: number | null;
  high: boolean;
}

/** One CSV row, already translated to the English domain (see docs/csv-contract.md). */
export interface Reading {
  /** Local ISO date-time without timezone, e.g. "2026-11-10T14:32:08". */
  timestamp: string;
  source: ReadingSource;
  level: RiskLevel;
  scenarioId: number;
  mq6: GasSensorReading;
  mq2: GasSensorReading;
  flame: boolean;
  temperature: TemperatureReading;
  motion: boolean;
  stoveOn: boolean;
  secondsWithoutMotion: number;
}
