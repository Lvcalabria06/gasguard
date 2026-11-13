import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getScenario } from "@/lib/scenarios";
import type { Reading, RiskLevel } from "@/types";

import {
  ALERT_THROTTLE_MS,
  alertSubject,
  alertText,
  canSendAlert,
  enteredCritical,
} from "./alert-policy";

function reading(
  level: RiskLevel,
  source: Reading["source"] = "mock",
): Reading {
  return {
    timestamp: "2026-11-12T14:32:08",
    source,
    level,
    scenarioId: 1,
    mq6: { value: 1120, base: 290, level: 2 },
    mq2: { value: 1350, base: 900, level: 1 },
    flame: true,
    temperature: { celsius: 29.1, limit: 28.4, high: true },
    motion: false,
    stoveOn: true,
    secondsWithoutMotion: 42,
  };
}

describe("enteredCritical", () => {
  it("is true only when the level becomes CRITICAL", () => {
    expect(enteredCritical(null, "CRITICAL")).toBe(true);
    expect(enteredCritical("HIGH", "CRITICAL")).toBe(true);
    expect(enteredCritical("NORMAL", "CRITICAL")).toBe(true);
    expect(enteredCritical("CRITICAL", "CRITICAL")).toBe(false);
    expect(enteredCritical(null, "HIGH")).toBe(false);
    expect(enteredCritical("CRITICAL", "NORMAL")).toBe(false);
    expect(enteredCritical("ALERT", "HIGH")).toBe(false);
  });
});

describe("canSendAlert", () => {
  it("allows the first send and the 5 minute boundary, not a millisecond before", () => {
    const now = 1_000_000;
    expect(canSendAlert(undefined, now)).toBe(true);
    expect(canSendAlert(now, now)).toBe(false);
    expect(canSendAlert(now - (ALERT_THROTTLE_MS - 1), now)).toBe(false);
    expect(canSendAlert(now - ALERT_THROTTLE_MS, now)).toBe(true);
    expect(ALERT_THROTTLE_MS).toBe(5 * 60 * 1000);
  });
});

describe("alertSubject / alertText", () => {
  it("prefixes [SIMULAÇÃO] only for mock readings", () => {
    expect(alertSubject("mock")).toBe("[SIMULAÇÃO] GasGuard: risco crítico");
    expect(alertSubject("board")).toBe("GasGuard: risco crítico");
  });

  it("copies scenario copy and the academic disclaimer", () => {
    const scenario = getScenario(1);
    const body = alertText(reading("CRITICAL", "mock"));
    expect(body).toContain("Nível: Crítico");
    expect(body).toContain(`Cenário: ${scenario.title}`);
    expect(body).toContain(`Orientação: ${scenario.guidance}`);
    expect(body).toContain("Horário: 2026-11-12T14:32:08");
    expect(body).toContain(
      "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.",
    );
    expect(body).not.toMatch(/certificado de proteção|detector certificado de gás/i);
  });
});
