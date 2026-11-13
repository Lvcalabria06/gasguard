import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getRecentReadings, getReportPath, watchReadings } from "@/services/report/report-service";
import type { Reading } from "@/types";

const HEADER =
  "hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento";

const DATE = "2026-11-10";

const CONTRACT_LINE =
  "14:32:08,placa,CRITICO,1,1120,290,2,1350,900,1,1,29.1,28.4,1,0,1,42";

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

function csvLine(
  hora: string,
  nivel = "NORMAL",
  extras: { origem?: string; cenario?: string } = {},
): string {
  return [
    hora,
    extras.origem ?? "mock",
    nivel,
    extras.cenario ?? "0",
    "200",
    "180",
    "0",
    "150",
    "140",
    "0",
    "0",
    "24.0",
    "26.0",
    "0",
    "1",
    "0",
    "0",
  ].join(",");
}

function reportFile(date: string, dataLines: string[]): string {
  return [`data,${date}`, HEADER, ...dataLines].join("\n") + "\n";
}

const originalEnv = process.env.DAILY_REPORT_PATH;

let tmpDir: string;
let reportPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "gasguard-report-"));
  reportPath = join(tmpDir, "daily-report.csv");
  process.env.DAILY_REPORT_PATH = reportPath;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(tmpDir, { recursive: true, force: true });
  if (originalEnv === undefined) {
    delete process.env.DAILY_REPORT_PATH;
  } else {
    process.env.DAILY_REPORT_PATH = originalEnv;
  }
});

describe("getReportPath", () => {
  it("resolves DAILY_REPORT_PATH from cwd, defaulting to ../daily-report.csv", () => {
    delete process.env.DAILY_REPORT_PATH;
    expect(getReportPath()).toBe(resolve(process.cwd(), "../daily-report.csv"));

    process.env.DAILY_REPORT_PATH = "tmp/custom.csv";
    expect(getReportPath()).toBe(resolve(process.cwd(), "tmp/custom.csv"));

    process.env.DAILY_REPORT_PATH = reportPath;
    expect(getReportPath()).toBe(reportPath);
  });
});

describe("getRecentReadings", () => {
  it("returns null and logs when the file is missing", async () => {
    expect(await getRecentReadings()).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "[report-service] missing file:",
      reportPath,
    );
  });

  it("returns null and logs when line 1 is not data,YYYY-MM-DD", async () => {
    writeFileSync(reportPath, ["data,10-11-2026", HEADER, csvLine("14:32:08")].join("\n") + "\n");
    expect(await getRecentReadings()).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "[report-service] invalid date line or header:",
      reportPath,
    );
  });

  it("returns null and logs when the header does not match the contract", async () => {
    writeFileSync(
      reportPath,
      ["data,2026-11-10", "hora,origem,nivel", csvLine("14:32:08")].join("\n") + "\n",
    );
    expect(await getRecentReadings()).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "[report-service] invalid date line or header:",
      reportPath,
    );
  });

  it("returns empty readings and events for a valid file with only the envelope", async () => {
    writeFileSync(reportPath, reportFile(DATE, []));
    expect(await getRecentReadings()).toEqual({
      date: DATE,
      readings: [],
      events: [],
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("translates the csv-contract example and detects the FAILURE event", async () => {
    const failureLine =
      "14:32:10,placa,FALHA,16,300,290,0,910,900,0,0,,28.4,0,1,0,0";
    writeFileSync(
      reportPath,
      reportFile(DATE, [
        CONTRACT_LINE,
        "14:32:09,placa,CRITICO,1,1118,290,2,1342,900,1,1,29.1,28.4,1,0,1,43",
        failureLine,
      ]),
    );

    const result = await getRecentReadings();
    expect(result?.date).toBe(DATE);
    expect(result?.readings[0]).toEqual(CONTRACT_READING);
    expect(result?.readings).toHaveLength(3);
    expect(result?.events).toEqual([
      {
        id: "2026-11-10T14:32:10",
        timestamp: "2026-11-10T14:32:10",
        from: "CRITICAL",
        to: "FAILURE",
        scenarioId: 16,
        source: "board",
      },
    ]);
  });

  it("keeps the last 10 minutes of readings and events for the whole day", async () => {
    writeFileSync(
      reportPath,
      reportFile(DATE, [
        csvLine("08:00:00", "NORMAL"),
        csvLine("08:00:01", "ATENCAO", { cenario: "10" }),
        csvLine("14:22:09", "ATENCAO", { cenario: "10" }),
        csvLine("14:22:10", "ATENCAO", { cenario: "10" }),
        csvLine("14:32:10", "ALERTA", { cenario: "7" }),
      ]),
    );

    const result = await getRecentReadings();
    expect(result?.readings.map((reading) => reading.timestamp)).toEqual([
      "2026-11-10T14:22:10",
      "2026-11-10T14:32:10",
    ]);
    expect(result?.events.map((event) => [event.from, event.to, event.id])).toEqual([
      ["NORMAL", "ATTENTION", "2026-11-10T08:00:01"],
      ["ATTENTION", "ALERT", "2026-11-10T14:32:10"],
    ]);
  });

  it("skips an invalid data line, logs it, and keeps the neighbors", async () => {
    const badLine = csvLine("14:32:09").split(",").slice(0, 16).join(",");
    writeFileSync(
      reportPath,
      reportFile(DATE, [csvLine("14:32:08"), badLine, csvLine("14:32:10", "ALERTA", { cenario: "7" })]),
    );

    const result = await getRecentReadings();
    expect(result?.readings.map((reading) => reading.timestamp)).toEqual([
      "2026-11-10T14:32:08",
      "2026-11-10T14:32:10",
    ]);
    expect(result?.events).toEqual([
      {
        id: "2026-11-10T14:32:10",
        timestamp: "2026-11-10T14:32:10",
        from: "NORMAL",
        to: "ALERT",
        scenarioId: 7,
        source: "mock",
      },
    ]);
    expect(console.error).toHaveBeenCalledWith(
      "[report-service] skipped invalid CSV line:",
      badLine,
    );
  });
});

describe("watchReadings", () => {
  let stop: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    vi.useRealTimers();
  });

  it("does not replay existing lines, then emits each appended reading", () => {
    writeFileSync(
      reportPath,
      reportFile(DATE, [csvLine("14:32:08"), csvLine("14:32:09")]),
    );

    const onReading = vi.fn();
    const onReset = vi.fn();
    stop = watchReadings({ onReading, onReset });

    expect(onReading).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();

    writeFileSync(
      reportPath,
      reportFile(DATE, [csvLine("14:32:08"), csvLine("14:32:09"), csvLine("14:32:10", "ALERTA", { cenario: "7" })]),
    );
    vi.advanceTimersByTime(500);

    expect(onReading).toHaveBeenCalledTimes(1);
    expect(onReading.mock.calls[0][0].timestamp).toBe("2026-11-10T14:32:10");
    expect(onReading.mock.calls[0][0].level).toBe("ALERT");
    expect(onReset).not.toHaveBeenCalled();

    stop();
    writeFileSync(
      reportPath,
      reportFile(DATE, [
        csvLine("14:32:08"),
        csvLine("14:32:09"),
        csvLine("14:32:10", "ALERTA", { cenario: "7" }),
        csvLine("14:32:11"),
      ]),
    );
    vi.advanceTimersByTime(500);
    expect(onReading).toHaveBeenCalledTimes(1);
  });

  it("calls onReset when the file shrinks and does not replay the new snapshot", () => {
    writeFileSync(
      reportPath,
      reportFile(DATE, [csvLine("14:32:08"), csvLine("14:32:09"), csvLine("14:32:10")]),
    );

    const onReading = vi.fn();
    const onReset = vi.fn();
    stop = watchReadings({ onReading, onReset });

    writeFileSync(reportPath, reportFile("2026-11-11", [csvLine("00:00:01")]));
    vi.advanceTimersByTime(500);

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onReading).not.toHaveBeenCalled();

    writeFileSync(
      reportPath,
      reportFile("2026-11-11", [csvLine("00:00:01"), csvLine("00:00:02", "ALERTA", { cenario: "7" })]),
    );
    vi.advanceTimersByTime(500);

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onReading).toHaveBeenCalledTimes(1);
    expect(onReading.mock.calls[0][0].timestamp).toBe("2026-11-11T00:00:02");

    stop();
  });

  it("skips an invalid appended line and keeps watching", () => {
    writeFileSync(reportPath, reportFile(DATE, [csvLine("14:32:08")]));

    const onReading = vi.fn();
    stop = watchReadings({ onReading, onReset: vi.fn() });

    const badLine = csvLine("14:32:09").split(",").slice(0, 16).join(",");
    writeFileSync(reportPath, reportFile(DATE, [csvLine("14:32:08"), badLine]));
    vi.advanceTimersByTime(500);

    expect(onReading).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "[report-service] skipped invalid CSV line:",
      badLine,
    );

    writeFileSync(
      reportPath,
      reportFile(DATE, [csvLine("14:32:08"), badLine, csvLine("14:32:10")]),
    );
    vi.advanceTimersByTime(500);

    expect(onReading).toHaveBeenCalledTimes(1);
    expect(onReading.mock.calls[0][0].timestamp).toBe("2026-11-10T14:32:10");

    stop();
  });
});

