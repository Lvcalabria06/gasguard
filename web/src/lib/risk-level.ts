import type { RiskLevel } from "@/types";

/** Every risk level, from lowest to highest severity, then FAILURE. */
export const RISK_LEVELS = [
  "NORMAL",
  "ATTENTION",
  "ALERT",
  "HIGH",
  "CRITICAL",
  "FAILURE",
] as const satisfies readonly RiskLevel[];

export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && (RISK_LEVELS as readonly string[]).includes(value);
}
