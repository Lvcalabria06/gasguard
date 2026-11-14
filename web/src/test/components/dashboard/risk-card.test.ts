import { describe, expect, it } from "vitest";

import { getScenario } from "@/lib/scenarios";
import type { Reading, RiskLevel } from "@/types";

import { riskView } from "./risk-card";

function reading(
  extras: Partial<Pick<Reading, "level" | "scenarioId" | "source">> = {},
): Reading {
  return {
    timestamp: "2026-11-12T14:32:08",
    source: extras.source ?? "board",
    level: extras.level ?? "NORMAL",
    scenarioId: extras.scenarioId ?? 0,
    mq6: { value: 200, base: 180, level: 0 },
    mq2: { value: 150, base: 140, level: 0 },
    flame: false,
    temperature: { celsius: 24, limit: 35, high: false },
    motion: true,
    stoveOn: false,
    secondsWithoutMotion: 0,
  };
}

const NO_DATA = {
  title: "Sem dados",
  guidance: "—",
  surfaceClass: "bg-zinc-500",
  textClass: "text-white",
  pulse: false,
  alternate: false,
  simulation: false,
} as const;

describe("riskView", () => {
  it("paints each firmware level with the spec color and pulse", () => {
    const cases: {
      level: RiskLevel;
      scenarioId: number;
      surfaceClass: string;
      textClass: string;
      pulse: boolean;
      alternate: boolean;
    }[] = [
      {
        level: "NORMAL",
        scenarioId: 0,
        surfaceClass: "bg-emerald-600",
        textClass: "text-white",
        pulse: false,
        alternate: false,
      },
      {
        level: "ATTENTION",
        scenarioId: 10,
        surfaceClass: "bg-amber-400",
        textClass: "text-zinc-950",
        pulse: false,
        alternate: false,
      },
      {
        level: "ALERT",
        scenarioId: 7,
        surfaceClass: "bg-orange-500",
        textClass: "text-white",
        pulse: true,
        alternate: false,
      },
      {
        level: "HIGH",
        scenarioId: 4,
        surfaceClass: "bg-red-600",
        textClass: "text-white",
        pulse: true,
        alternate: false,
      },
      {
        level: "CRITICAL",
        scenarioId: 1,
        surfaceClass: "bg-red-900",
        textClass: "text-white",
        pulse: true,
        alternate: true,
      },
      {
        level: "FAILURE",
        scenarioId: 16,
        surfaceClass: "bg-zinc-500",
        textClass: "text-white",
        pulse: false,
        alternate: false,
      },
    ];

    for (const row of cases) {
      const scenario = getScenario(row.scenarioId);
      expect(
        riskView(reading({ level: row.level, scenarioId: row.scenarioId }), "live"),
      ).toEqual({
        title: scenario.title,
        guidance: scenario.guidance,
        surfaceClass: row.surfaceClass,
        textClass: row.textClass,
        pulse: row.pulse,
        alternate: row.alternate,
        simulation: false,
      });
    }
  });

  it("uses Sem dados instead of Ambiente normal when the connection is stale", () => {
    const staleNormal = reading({
      level: "NORMAL",
      scenarioId: 0,
      source: "mock",
    });

    expect(riskView(staleNormal, "no_data")).toEqual(NO_DATA);
    expect(riskView(staleNormal, "no_data").title).not.toBe("Ambiente normal");
  });

  it("uses Sem dados when there is no reading, even if the socket is live", () => {
    expect(riskView(null, "live")).toEqual(NO_DATA);
    expect(riskView(null, "reconnecting")).toEqual(NO_DATA);
    expect(riskView(null, "no_data")).toEqual(NO_DATA);
  });

  it("keeps FAILURE copy when data is fresh, and still shows risk while reconnecting", () => {
    const failure = reading({ level: "FAILURE", scenarioId: 16 });
    const scenario = getScenario(16);

    expect(riskView(failure, "live")).toMatchObject({
      title: scenario.title,
      guidance: scenario.guidance,
      surfaceClass: "bg-zinc-500",
      pulse: false,
      simulation: false,
    });
    expect(riskView(failure, "live").title).not.toBe("Sem dados");

    const critical = reading({ level: "CRITICAL", scenarioId: 1 });
    expect(riskView(critical, "reconnecting")).toMatchObject({
      title: getScenario(1).title,
      surfaceClass: "bg-red-900",
      pulse: true,
      alternate: true,
    });
  });

  it("shows SIMULAÇÃO only for a visible mock reading", () => {
    expect(
      riskView(reading({ source: "mock", scenarioId: 0 }), "live").simulation,
    ).toBe(true);
    expect(
      riskView(reading({ source: "board", scenarioId: 0 }), "live").simulation,
    ).toBe(false);
    expect(
      riskView(reading({ source: "mock", scenarioId: 0 }), "no_data").simulation,
    ).toBe(false);
  });

  it("keeps the level color when the scenario id is unknown", () => {
    const view = riskView(
      reading({ level: "ALERT", scenarioId: 99 }),
      "live",
    );
    const unknown = getScenario(99);

    expect(view.title).toBe(unknown.title);
    expect(view.guidance).toBe(unknown.guidance);
    expect(view.surfaceClass).toBe("bg-orange-500");
    expect(view.pulse).toBe(true);
  });
});
