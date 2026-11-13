import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseCsvLine } from "@/services/report/parse-csv-line";
import type { Reading, RiskLevel } from "@/types";

const DATE = "2026-11-10";

function csvLine(
  overrides: Partial<{
    hora: string;
    origem: string;
    nivel: string;
    cenario: string;
    mq6: string;
    mq6_base: string;
    mq6_nivel: string;
    mq2: string;
    mq2_base: string;
    mq2_nivel: string;
    chama: string;
    temp: string;
    temp_limite: string;
    temp_alta: string;
    movimento: string;
    fogao: string;
    seg_sem_movimento: string;
  }> = {},
): string {
  const row = {
    hora: "14:32:08",
    origem: "placa",
    nivel: "CRITICO",
    cenario: "1",
    mq6: "1120",
    mq6_base: "290",
    mq6_nivel: "2",
    mq2: "1350",
    mq2_base: "900",
    mq2_nivel: "1",
    chama: "1",
    temp: "29.1",
    temp_limite: "28.4",
    temp_alta: "1",
    movimento: "0",
    fogao: "1",
    seg_sem_movimento: "42",
    ...overrides,
  };
  return [
    row.hora,
    row.origem,
    row.nivel,
    row.cenario,
    row.mq6,
    row.mq6_base,
    row.mq6_nivel,
    row.mq2,
    row.mq2_base,
    row.mq2_nivel,
    row.chama,
    row.temp,
    row.temp_limite,
    row.temp_alta,
    row.movimento,
    row.fogao,
    row.seg_sem_movimento,
  ].join(",");
}

const CONTRACT_READING: Reading = {
  timestamp: "2026-11-10T14:32:08",
  source: "board",
  level: "CRITICAL",
  scenarioId: 1,
  mq6: { value: 1120, base: 290, level: 2 },
  mq2: { value: 1350, base: 900, level: 1 },
  flame: true,
  temperature: { celsius: 29.1, limit: 28.4, high: true },
  motion: false,
  stoveOn: true,
  secondsWithoutMotion: 42,
};

describe("parseCsvLine", () => {
  it("translates the csv-contract example into Reading", () => {
    expect(parseCsvLine(csvLine(), DATE)).toEqual(CONTRACT_READING);
  });

  it("maps every Portuguese nivel to English", () => {
    const levels: [string, RiskLevel][] = [
      ["NORMAL", "NORMAL"],
      ["ATENCAO", "ATTENTION"],
      ["ALERTA", "ALERT"],
      ["ALTO", "HIGH"],
      ["CRITICO", "CRITICAL"],
      ["FALHA", "FAILURE"],
    ];
    for (const [csv, level] of levels) {
      expect(parseCsvLine(csvLine({ nivel: csv }), DATE)?.level).toBe(level);
    }
  });

  it("maps origem placa to board and mock to mock", () => {
    expect(parseCsvLine(csvLine({ origem: "placa" }), DATE)?.source).toBe("board");
    expect(parseCsvLine(csvLine({ origem: "mock" }), DATE)?.source).toBe("mock");
  });

  it("builds a timezone-free timestamp from date + hora", () => {
    expect(parseCsvLine(csvLine({ hora: "00:00:00" }), "2026-01-02")?.timestamp).toBe(
      "2026-01-02T00:00:00",
    );
  });

  it("treats empty temp and temp_limite as null, and 0.0 as zero", () => {
    expect(
      parseCsvLine(csvLine({ temp: "", temp_limite: "28.4", temp_alta: "0" }), DATE)
        ?.temperature,
    ).toEqual({ celsius: null, limit: 28.4, high: false });
    expect(
      parseCsvLine(csvLine({ temp: "26.4", temp_limite: "" }), DATE)?.temperature,
    ).toEqual({ celsius: 26.4, limit: null, high: true });
    expect(
      parseCsvLine(csvLine({ temp: "0.0", temp_limite: "0" }), DATE)?.temperature,
    ).toEqual({ celsius: 0, limit: 0, high: true });
  });

  it("keeps scenarioId even when it is outside 0–17", () => {
    expect(parseCsvLine(csvLine({ cenario: "18" }), DATE)?.scenarioId).toBe(18);
    expect(parseCsvLine(csvLine({ cenario: "-1" }), DATE)?.scenarioId).toBe(-1);
  });

  it("returns null when the line does not have 17 fields", () => {
    expect(parseCsvLine("14:32:08,placa,CRITICO", DATE)).toBeNull();
    expect(parseCsvLine(`${csvLine()},`, DATE)).toBeNull();
    expect(parseCsvLine("", DATE)).toBeNull();
  });

  it("returns null for unknown nivel, origem, or English level names", () => {
    for (const nivel of ["ATTENTION", "ALERT", "HIGH", "CRITICAL", "FAILURE", "critico", ""]) {
      expect(parseCsvLine(csvLine({ nivel }), DATE)).toBeNull();
    }
    expect(parseCsvLine(csvLine({ origem: "board" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ origem: " placa" }), DATE)).toBeNull();
  });

  it("returns null for invalid field types", () => {
    expect(parseCsvLine(csvLine({ mq6: "1120.5" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ mq6: "-1" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ mq6_nivel: "3" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ chama: "2" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ temp: "26." }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ temp: "1e2" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ fogao: "" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ seg_sem_movimento: "-1" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ cenario: "1.0" }), DATE)).toBeNull();
  });

  it("returns null when date or hora is malformed", () => {
    expect(parseCsvLine(csvLine(), "2026/11/10")).toBeNull();
    expect(parseCsvLine(csvLine(), "")).toBeNull();
    expect(parseCsvLine(csvLine({ hora: "14:32" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ hora: "24:00:00" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ hora: "14:60:00" }), DATE)).toBeNull();
  });
});
