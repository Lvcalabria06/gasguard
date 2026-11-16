import "server-only";

import type { GasLevel, Reading, ReadingSource, RiskLevel } from "@/types";

const SOURCE_BY_CSV = {
  placa: "board",
  mock: "mock",
} as const satisfies Record<string, ReadingSource>;

const LEVEL_BY_CSV = {
  NORMAL: "NORMAL",
  ATENCAO: "ATTENTION",
  ALERTA: "ALERT",
  ALTO: "HIGH",
  CRITICO: "CRITICAL",
  FALHA: "FAILURE",
} as const satisfies Record<string, RiskLevel>;

function parseSource(raw: string): ReadingSource | null {
  if (!Object.hasOwn(SOURCE_BY_CSV, raw)) return null;
  return SOURCE_BY_CSV[raw as keyof typeof SOURCE_BY_CSV];
}

function parseLevel(raw: string): RiskLevel | null {
  if (!Object.hasOwn(LEVEL_BY_CSV, raw)) return null;
  return LEVEL_BY_CSV[raw as keyof typeof LEVEL_BY_CSV];
}

function parseInteger(raw: string): number | null {
  if (!/^-?\d+$/.test(raw)) return null;
  return Number(raw);
}

function parseNonNegativeInteger(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

function parseFlag(raw: string): boolean | null {
  if (raw === "0") return false;
  if (raw === "1") return true;
  return null;
}

function parseGasLevel(raw: string): GasLevel | null {
  if (raw === "0" || raw === "1" || raw === "2") return Number(raw) as GasLevel;
  return null;
}

function parseDecimal(raw: string): number | null {
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  return Number(raw);
}

function parseOptionalDecimal(raw: string): number | null | undefined {
  if (raw === "") return null;
  const value = parseDecimal(raw);
  return value === null ? undefined : value;
}

function parseHora(raw: string): string | null {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(raw);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return raw;
}

export function parseCsvLine(line: string, date: string): Reading | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const fields = line.split(",");
  if (fields.length !== 17) return null;

  const hora = parseHora(fields[0]);
  const source = parseSource(fields[1]);
  const level = parseLevel(fields[2]);
  const scenarioId = parseInteger(fields[3]);
  const mq6Value = parseNonNegativeInteger(fields[4]);
  const mq6Base = parseNonNegativeInteger(fields[5]);
  const mq6Level = parseGasLevel(fields[6]);
  const mq2Value = parseNonNegativeInteger(fields[7]);
  const mq2Base = parseNonNegativeInteger(fields[8]);
  const mq2Level = parseGasLevel(fields[9]);
  const flame = parseFlag(fields[10]);
  const celsius = parseOptionalDecimal(fields[11]);
  const limit = parseOptionalDecimal(fields[12]);
  const high = parseFlag(fields[13]);
  const motion = parseFlag(fields[14]);
  const stoveOn = parseFlag(fields[15]);
  const secondsWithoutMotion = parseNonNegativeInteger(fields[16]);

  if (
    hora === null ||
    source === null ||
    level === null ||
    scenarioId === null ||
    mq6Value === null ||
    mq6Base === null ||
    mq6Level === null ||
    mq2Value === null ||
    mq2Base === null ||
    mq2Level === null ||
    flame === null ||
    celsius === undefined ||
    limit === undefined ||
    high === null ||
    motion === null ||
    stoveOn === null ||
    secondsWithoutMotion === null
  ) {
    return null;
  }

  return {
    timestamp: `${date}T${hora}`,
    source,
    level,
    scenarioId,
    mq6: { value: mq6Value, base: mq6Base, level: mq6Level },
    mq2: { value: mq2Value, base: mq2Base, level: mq2Level },
    flame,
    temperature: { celsius, limit, high },
    motion,
    stoveOn,
    secondsWithoutMotion,
  };
}
