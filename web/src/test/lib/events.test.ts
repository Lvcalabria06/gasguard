import { describe, expect, it } from "vitest";
import { detectEvents } from "@/lib/events";
import type { Reading, RiskLevel } from "@/types";

function reading(
  timestamp: string,
  level: RiskLevel,
  extras: Partial<Pick<Reading, "scenarioId" | "source">> = {},
): Reading {
  return {
    timestamp,
    source: extras.source ?? "mock",
    level,
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

describe("detectEvents", () => {
  it("returns no events for an empty list or a single reading", () => {
    expect(detectEvents([])).toEqual([]);
    expect(
      detectEvents([reading("2026-11-12T14:32:08", "CRITICAL", { scenarioId: 1 })]),
    ).toEqual([]);
  });

  it("emits one event when NORMAL stays then becomes ALERT", () => {
    const events = detectEvents([
      reading("2026-11-12T14:32:08", "NORMAL"),
      reading("2026-11-12T14:32:09", "NORMAL"),
      reading("2026-11-12T14:32:10", "ALERT", { scenarioId: 7 }),
    ]);
    expect(events).toEqual([
      {
        id: "2026-11-12T14:32:10",
        timestamp: "2026-11-12T14:32:10",
        from: "NORMAL",
        to: "ALERT",
        scenarioId: 7,
        source: "mock",
      },
    ]);
  });

  it("emits one event per consecutive level change and skips repeats", () => {
    const events = detectEvents([
      reading("2026-11-12T14:32:08", "NORMAL"),
      reading("2026-11-12T14:32:09", "ATTENTION", { scenarioId: 10 }),
      reading("2026-11-12T14:32:10", "ALERT", { scenarioId: 7 }),
      reading("2026-11-12T14:32:11", "ALERT", { scenarioId: 7 }),
      reading("2026-11-12T14:32:12", "HIGH", { scenarioId: 4, source: "board" }),
    ]);
    expect(events.map((event) => [event.from, event.to, event.id, event.source])).toEqual([
      ["NORMAL", "ATTENTION", "2026-11-12T14:32:09", "mock"],
      ["ATTENTION", "ALERT", "2026-11-12T14:32:10", "mock"],
      ["ALERT", "HIGH", "2026-11-12T14:32:12", "board"],
    ]);
    expect(events.every((event) => event.from !== null)).toBe(true);
  });

  it("walks array order and does not sort by timestamp", () => {
    const events = detectEvents([
      reading("2026-11-12T14:32:09", "ALERT", { scenarioId: 7 }),
      reading("2026-11-12T14:32:08", "NORMAL"),
    ]);
    expect(events).toEqual([
      {
        id: "2026-11-12T14:32:08",
        timestamp: "2026-11-12T14:32:08",
        from: "ALERT",
        to: "NORMAL",
        scenarioId: 0,
        source: "mock",
      },
    ]);
  });
});
