import { describe, expect, it } from "vitest";

import { getScenario } from "@/lib/scenarios";
import type { Reading, RiskLevel } from "@/types";

import { LEVEL_THEME } from "@/components/dashboard/level-theme";
import { riskView } from "@/components/dashboard/risk-card";

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

describe("riskView", () => {
  it("paints each firmware level with the spec hue, label and pulse", () => {
    // docs/scenarios.md: verde, amarelo, laranja (pulsa), vermelho (pulsa),
    // vermelho escuro (pulsa, alterna), cinza.
    const cases: {
      level: RiskLevel;
      scenarioId: number;
      hue: string;
      heading: string;
      pulse: boolean;
      alternate: boolean;
    }[] = [
      { level: "NORMAL", scenarioId: 0, hue: "emerald", heading: "Normal", pulse: false, alternate: false },
      { level: "ATTENTION", scenarioId: 10, hue: "amber", heading: "Atenção", pulse: false, alternate: false },
      { level: "ALERT", scenarioId: 7, hue: "orange", heading: "Alerta", pulse: true, alternate: false },
      { level: "HIGH", scenarioId: 4, hue: "red-5", heading: "Alto risco", pulse: true, alternate: false },
      { level: "CRITICAL", scenarioId: 1, hue: "red-8", heading: "Crítico", pulse: true, alternate: true },
      { level: "FAILURE", scenarioId: 16, hue: "zinc", heading: "Falha", pulse: false, alternate: false },
    ];

    for (const row of cases) {
      const scenario = getScenario(row.scenarioId);
      const view = riskView(reading({ level: row.level, scenarioId: row.scenarioId }), "live");
      expect(view).toMatchObject({
        level: row.level,
        heading: row.heading,
        title: scenario.title,
        guidance: scenario.guidance === "—" ? null : scenario.guidance,
        surfaceClass: LEVEL_THEME[row.level].surfaceClass,
        pulse: row.pulse,
        alternate: row.alternate,
        simulation: false,
      });
      expect(view.surfaceClass).toContain(row.hue);
    }
  });

  it("hides the guidance box when the scenario has none", () => {
    expect(riskView(reading({ level: "NORMAL", scenarioId: 0 }), "live").guidance).toBeNull();
    expect(riskView(reading({ level: "NORMAL", scenarioId: 17 }), "live").guidance).toBeNull();
  });

  it("uses Sem dados instead of Ambiente normal when the connection is stale", () => {
    const staleNormal = reading({ level: "NORMAL", scenarioId: 0, source: "mock" });
    const view = riskView(staleNormal, "no_data");

    expect(view).toMatchObject({
      level: null,
      heading: "Sem dados",
      title: "Sem dados",
      pulse: false,
      alternate: false,
      simulation: false,
    });
    expect(view.title).not.toBe("Ambiente normal");
    expect(view.surfaceClass).toContain("slate");
    expect(view.guidance).toMatch(/5 s/);
  });

  it("uses Sem dados when there is no reading, even if the socket is live", () => {
    for (const connection of ["live", "reconnecting", "no_data"] as const) {
      expect(riskView(null, connection)).toMatchObject({ level: null, title: "Sem dados" });
    }
  });

  it("keeps FAILURE copy when data is fresh, and still shows risk while reconnecting", () => {
    const failure = reading({ level: "FAILURE", scenarioId: 16 });
    const scenario = getScenario(16);

    expect(riskView(failure, "live")).toMatchObject({
      title: scenario.title,
      guidance: scenario.guidance,
      pulse: false,
      simulation: false,
    });
    expect(riskView(failure, "live").title).not.toBe("Sem dados");

    const critical = reading({ level: "CRITICAL", scenarioId: 1 });
    expect(riskView(critical, "reconnecting")).toMatchObject({
      level: "CRITICAL",
      title: getScenario(1).title,
      pulse: true,
      alternate: true,
    });
  });

  it("shows SIMULAÇÃO only for a visible mock reading", () => {
    expect(riskView(reading({ source: "mock", scenarioId: 0 }), "live").simulation).toBe(true);
    expect(riskView(reading({ source: "board", scenarioId: 0 }), "live").simulation).toBe(false);
    expect(riskView(reading({ source: "mock", scenarioId: 0 }), "no_data").simulation).toBe(false);
  });

  it("keeps the level color when the scenario id is unknown", () => {
    const view = riskView(reading({ level: "ALERT", scenarioId: 99 }), "live");
    const unknown = getScenario(99);

    expect(view.title).toBe(unknown.title);
    expect(view.guidance).toBeNull(); // unknown scenario has guidance "—"
    expect(view.surfaceClass).toBe(LEVEL_THEME.ALERT.surfaceClass);
    expect(view.pulse).toBe(true);
  });
});
