import "server-only";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { detectEvents } from "@/lib/events";
import type { Reading, RecentReadings } from "@/types";

import { parseCsvLine } from "./parse-csv-line";
import { readNewLines } from "./tail-report";

const DEFAULT_REPORT_PATH = "../daily-report.csv";
const HEADER =
  "hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento";
const DATE_LINE = /^data,(\d{4}-\d{2}-\d{2})$/;
const WINDOW_SECONDS = 10 * 60;

export function getReportPath(): string {
  return resolve(process.cwd(), process.env.DAILY_REPORT_PATH ?? DEFAULT_REPORT_PATH);
}

function secondsOfDay(timestamp: string): number {
  const [hours, minutes, seconds] = timestamp.slice(11).split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function recentWindow(readings: Reading[]): Reading[] {
  if (readings.length === 0) return [];
  const last = secondsOfDay(readings[readings.length - 1].timestamp);
  const earliest = last - WINDOW_SECONDS;
  return readings.filter((reading) => secondsOfDay(reading.timestamp) >= earliest);
}

function readReportFile(): string | null {
  try {
    return readFileSync(getReportPath(), "utf8");
  } catch {
    return null;
  }
}

function parseEnvelope(content: string): string | null {
  const firstBreak = content.indexOf("\n");
  if (firstBreak === -1) return null;

  const dateMatch = DATE_LINE.exec(content.slice(0, firstBreak));
  if (!dateMatch) return null;

  const secondBreak = content.indexOf("\n", firstBreak + 1);
  if (secondBreak === -1) return null;

  const header = content.slice(firstBreak + 1, secondBreak);
  if (header !== HEADER) return null;

  return dateMatch[1];
}

function parseReadings(content: string, date: string): Reading[] {
  const readings: Reading[] = [];
  for (const line of readNewLines(content, 0).lines) {
    const reading = parseCsvLine(line, date);
    if (reading === null) {
      console.error("[report-service] skipped invalid CSV line:", line);
      continue;
    }
    readings.push(reading);
  }
  return readings;
}

export async function getRecentReadings(): Promise<RecentReadings | null> {
  const path = getReportPath();
  const content = readReportFile();
  if (content === null) {
    console.error("[report-service] missing file:", path);
    return null;
  }

  const date = parseEnvelope(content);
  if (date === null) {
    console.error("[report-service] invalid date line or header:", path);
    return null;
  }

  const readings = parseReadings(content, date);
  return {
    date,
    readings: recentWindow(readings),
    events: detectEvents(readings),
  };
}
