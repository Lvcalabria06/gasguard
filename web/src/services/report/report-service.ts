import "server-only";

import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { detectEvents } from "@/lib/events";
import { parseLocalIso } from "@/lib/format";
import type { Reading, RecentReadings } from "@/types";

import { parseCsvLine } from "./parse-csv-line";
import { readNewLines, stripCarriageReturn } from "./tail-report";

const DEFAULT_REPORT_PATH = "../daily-report.csv";
const HEADER =
  "hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento";
const DATE_LINE = /^data,(\d{4}-\d{2}-\d{2})$/;
const WINDOW_SECONDS = 10 * 60;
const POLL_MS = 500;
/** Enough for the date line + header (~150 bytes), so each tick can re-check the envelope cheaply. */
const ENVELOPE_PROBE_BYTES = 512;
const NEWLINE = 0x0a;

export function getReportPath(): string {
  return resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.DAILY_REPORT_PATH ?? DEFAULT_REPORT_PATH,
  );
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

/** Measured on the server, whose clock is the one that stamped `hora` (same computer). */
function lastReadingAgeMs(readings: Reading[], now: number): number | null {
  const last = readings[readings.length - 1];
  if (!last) return null;
  const at = parseLocalIso(last.timestamp);
  if (!at) return null;
  return Math.max(0, now - at.getTime());
}

function readReportFile(): string | null {
  try {
    return readFileSync(getReportPath(), "utf8");
  } catch {
    return null;
  }
}

function fileSize(path: string): number | null {
  try {
    return statSync(path).size;
  } catch {
    return null;
  }
}

/** Reads bytes [start, end) of the file, or null when it cannot be read. */
function readBytes(path: string, start: number, end: number): Buffer | null {
  let fd: number | undefined;
  try {
    fd = openSync(path, "r");
    const buffer = Buffer.alloc(end - start);
    const bytes = readSync(fd, buffer, 0, buffer.length, start);
    return buffer.subarray(0, bytes);
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function parseEnvelope(content: string): string | null {
  const firstBreak = content.indexOf("\n");
  if (firstBreak === -1) return null;

  const dateMatch = DATE_LINE.exec(stripCarriageReturn(content.slice(0, firstBreak)));
  if (!dateMatch) return null;

  const secondBreak = content.indexOf("\n", firstBreak + 1);
  if (secondBreak === -1) return null;

  const header = stripCarriageReturn(content.slice(firstBreak + 1, secondBreak));
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
    lastReadingAgeMs: lastReadingAgeMs(readings, Date.now()),
  };
}

/**
 * Follows the CSV by byte offset: each tick reads only the bytes appended since the last one.
 * The whole file is read only when watching starts or after the file was recreated.
 */
export function watchReadings(handlers: {
  onReading: (reading: Reading) => void;
  onReset: () => void;
}): () => void {
  const path = getReportPath();
  let date: string | null = null;
  /** Bytes already consumed: always the end of a complete line. */
  let offset = 0;

  /** Reads the whole file and returns its date and the end of its last complete line. */
  const resync = (): { date: string; offset: number } | null => {
    const content = readReportFile();
    if (content === null) return null;
    const envelopeDate = parseEnvelope(content);
    if (envelopeDate === null) return null;
    const { size } = readNewLines(content, 0);
    return { date: envelopeDate, offset: Buffer.byteLength(content.slice(0, size)) };
  };

  const emitLines = (chunk: Buffer, currentDate: string) => {
    const lastNewline = chunk.lastIndexOf(NEWLINE);
    if (lastNewline === -1) return;
    offset += lastNewline + 1;
    const lines = chunk.subarray(0, lastNewline).toString("utf8").split("\n");
    for (const rawLine of lines) {
      const line = stripCarriageReturn(rawLine);
      const reading = parseCsvLine(line, currentDate);
      if (reading === null) {
        console.error("[report-service] skipped invalid CSV line:", line);
        continue;
      }
      handlers.onReading(reading);
    }
  };

  const tick = () => {
    const size = fileSize(path);
    if (size === null) return;

    if (date === null) {
      const seed = resync();
      if (seed === null) return;
      ({ date, offset } = seed);
      return;
    }

    const probe = readBytes(path, 0, Math.min(size, ENVELOPE_PROBE_BYTES));
    if (probe === null) return;
    const currentDate = parseEnvelope(probe.toString("utf8"));
    if (currentDate === null) return;

    if (size < offset || currentDate !== date) {
      const seed = resync();
      if (seed === null) return;
      handlers.onReset();
      ({ date, offset } = seed);
      return;
    }

    if (size === offset) return;
    const chunk = readBytes(path, offset, size);
    if (chunk === null) return;
    emitLines(chunk, currentDate);
  };

  tick();
  const intervalId = setInterval(tick, POLL_MS);
  return () => clearInterval(intervalId);
}
