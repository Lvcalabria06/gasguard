import "server-only";

import { getScenario } from "@/lib/scenarios";
import type { Reading, RiskLevel } from "@/types";

export const ALERT_THROTTLE_MS = 5 * 60 * 1000;

export function enteredCritical(
  previous: RiskLevel | null,
  current: RiskLevel,
): boolean {
  return current === "CRITICAL" && previous !== "CRITICAL";
}

export function canSendAlert(
  lastSentAt: number | undefined,
  now: number,
): boolean {
  if (lastSentAt === undefined) return true;
  return now - lastSentAt >= ALERT_THROTTLE_MS;
}

export function alertSubject(source: Reading["source"]): string {
  const title = "GasGuard: risco crítico";
  return source === "mock" ? `[SIMULAÇÃO] ${title}` : title;
}

export function alertText(reading: Reading): string {
  const scenario = getScenario(reading.scenarioId);
  return [
    "Nível: Crítico",
    `Cenário: ${scenario.title}`,
    `Orientação: ${scenario.guidance}`,
    `Horário: ${reading.timestamp}`,
    "",
    "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.",
  ].join("\n");
}
