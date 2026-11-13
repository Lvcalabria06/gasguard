import { describe, expect, it } from "vitest";

import type { Reading } from "@/types";

import { chartView } from "./readings-chart";

function reading(extras: Partial<Reading> = {}): Reading {
  return {
    timestamp: "2026-11-12T14:32:08",
    source: "board",
    level: "NORMAL",
    scenarioId: 0,
    mq6: { value: 200, base: 180, level: 0 },
    mq2: { value: 150, base: 140, level: 0 },
    flame: false,
    temperature: { celsius: 24, limit: 35, high: false },
    motion: true,
    stoveOn: false,
    secondsWithoutMotion: 0,
    ...extras,
  };
}

describe("chartView", () => {
  it("keeps three labeled series and no points when the array is empty", () => {
    const view = chartView([]);

    expect(view.points).toEqual([]);
    expect(view.showDot).toBe(false);
    expect(view.series.map((row) => row.id)).toEqual([
      "mq6",
      "mq2",
      "temperature",
    ]);
    expect(view.series.map((row) => row.label)).toEqual([
      "GLP (MQ-6)",
      "Gases / fumaça (MQ-2)",
      "Temperatura",
    ]);
    expect(view.series.map((row) => row.yAxisId)).toEqual([
      "gas",
      "gas",
      "temp",
    ]);
  });

  it("maps timestamp to time-of-day and copies the three plotted values", () => {
    const view = chartView([
      reading({
        timestamp: "2026-11-12T14:32:08",
        mq6: { value: 1120, base: 290, level: 2 },
        mq2: { value: 1350, base: 900, level: 1 },
        temperature: { celsius: 29.1, limit: 28.4, high: true },
      }),
    ]);

    expect(view.points).toEqual([
      { time: "14:32:08", mq6: 1120, mq2: 1350, temperature: 29.1 },
    ]);
    expect(view.showDot).toBe(true);
  });

  it("keeps a null temperature as a gap and a zero temperature as zero", () => {
    const view = chartView([
      reading({
        timestamp: "2026-11-12T14:32:08",
        temperature: { celsius: null, limit: 28.4, high: false },
      }),
      reading({
        timestamp: "2026-11-12T14:32:09",
        temperature: { celsius: 0, limit: 28.4, high: false },
      }),
    ]);

    expect(view.points.map((point) => point.temperature)).toEqual([null, 0]);
    expect(view.points.map((point) => point.time)).toEqual([
      "14:32:08",
      "14:32:09",
    ]);
    expect(view.showDot).toBe(false);
  });

  it("plots every reading in input order and does not clip a 10-minute window", () => {
    const view = chartView([
      reading({ timestamp: "2026-11-12T14:00:00", mq6: { value: 1, base: 0, level: 0 } }),
      reading({ timestamp: "2026-11-12T14:20:00", mq6: { value: 2, base: 0, level: 0 } }),
    ]);

    expect(view.points).toEqual([
      { time: "14:00:00", mq6: 1, mq2: 150, temperature: 24 },
      { time: "14:20:00", mq6: 2, mq2: 150, temperature: 24 },
    ]);
  });
});
