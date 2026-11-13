import { describe, expect, it } from "vitest";

import type { Reading, RecentReadings, ReportEvent, RiskLevel } from "@/types";

import { initReadings, readingsReducer } from "./use-readings";

const NOW = new Date(2026, 10, 12, 14, 32, 20).getTime();

function reading(
  timestamp: string,
  level: RiskLevel = "NORMAL",
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

function snapshot(
  readings: Reading[],
  events: ReportEvent[] = [],
): RecentReadings {
  return { date: "2026-11-12", readings, events };
}

const MORNING_EVENT: ReportEvent = {
  id: "2026-11-12T08:00:00",
  timestamp: "2026-11-12T08:00:00",
  from: "NORMAL",
  to: "ALERT",
  scenarioId: 7,
  source: "mock",
};

describe("initReadings", () => {
  it("is no_data with empty buffers when initial is null", () => {
    const state = initReadings(null, NOW);

    expect(state).toMatchObject({
      readings: [],
      events: [],
      connection: "no_data",
      secondsSinceLast: null,
      streamOpen: false,
    });
  });

  it("keeps the day's events and marks reconnecting while the stream is closed", () => {
    const last = reading("2026-11-12T14:32:20");
    const state = initReadings(snapshot([last], [MORNING_EVENT]), NOW);

    expect(state.readings).toEqual([last]);
    expect(state.events).toEqual([MORNING_EVENT]);
    expect(state.connection).toBe("reconnecting");
    expect(state.secondsSinceLast).toBe(0);
    expect(state.streamOpen).toBe(false);
  });

  it("drops readings older than 10 minutes relative to the latest", () => {
    const kept = reading("2026-11-12T14:22:20");
    const latest = reading("2026-11-12T14:32:20");
    const state = initReadings(
      snapshot([
        reading("2026-11-12T14:22:19"),
        kept,
        latest,
      ]),
      NOW,
    );

    expect(state.readings.map((item) => item.timestamp)).toEqual([
      "2026-11-12T14:22:20",
      "2026-11-12T14:32:20",
    ]);
  });
});

describe("readingsReducer", () => {
  it("discards duplicate and older timestamps", () => {
    let state = initReadings(snapshot([reading("2026-11-12T14:32:20")]), NOW);
    state = readingsReducer(state, {
      type: "reading",
      reading: reading("2026-11-12T14:32:20", "ALERT", { scenarioId: 7 }),
      now: NOW,
    });
    state = readingsReducer(state, {
      type: "reading",
      reading: reading("2026-11-12T14:32:19"),
      now: NOW,
    });

    expect(state.readings).toHaveLength(1);
    expect(state.readings[0]?.level).toBe("NORMAL");
    expect(state.events).toEqual([]);
  });

  it("appends a newer reading, a level-change event, and keeps morning events", () => {
    const previous = reading("2026-11-12T14:32:19");
    let state = initReadings(snapshot([previous], [MORNING_EVENT]), NOW);
    const incoming = reading("2026-11-12T14:32:20", "ALERT", { scenarioId: 7 });
    state = readingsReducer(state, { type: "reading", reading: incoming, now: NOW });

    expect(state.readings.map((item) => item.timestamp)).toEqual([
      "2026-11-12T14:32:19",
      "2026-11-12T14:32:20",
    ]);
    expect(state.events).toEqual([
      MORNING_EVENT,
      {
        id: "2026-11-12T14:32:20",
        timestamp: "2026-11-12T14:32:20",
        from: "NORMAL",
        to: "ALERT",
        scenarioId: 7,
        source: "mock",
      },
    ]);
  });

  it("does not add an event when the level stays the same", () => {
    let state = initReadings(
      snapshot([reading("2026-11-12T14:32:19")], [MORNING_EVENT]),
      NOW,
    );
    state = readingsReducer(state, {
      type: "reading",
      reading: reading("2026-11-12T14:32:20"),
      now: NOW,
    });

    expect(state.events).toEqual([MORNING_EVENT]);
  });

  it("trims the chart buffer to the last 10 minutes after a live reading", () => {
    let state = initReadings(
      snapshot([
        reading("2026-11-12T14:22:19"),
        reading("2026-11-12T14:22:20"),
      ]),
      NOW,
    );
    state = readingsReducer(state, {
      type: "reading",
      reading: reading("2026-11-12T14:32:20"),
      now: NOW,
    });

    expect(state.readings.map((item) => item.timestamp)).toEqual([
      "2026-11-12T14:22:20",
      "2026-11-12T14:32:20",
    ]);
  });

  it("is live at 4 s and no_data at 5 s when the stream is open", () => {
    let state = initReadings(snapshot([reading("2026-11-12T14:32:16")]), NOW);
    state = readingsReducer(state, { type: "open", now: NOW });
    expect(state.connection).toBe("live");
    expect(state.secondsSinceLast).toBe(4);

    state = readingsReducer(state, {
      type: "tick",
      now: new Date(2026, 10, 12, 14, 32, 21).getTime(),
    });
    expect(state.connection).toBe("no_data");
    expect(state.secondsSinceLast).toBe(5);
  });

  it("is reconnecting on error while data is fresh, and no_data when it goes stale", () => {
    let state = initReadings(snapshot([reading("2026-11-12T14:32:20")]), NOW);
    state = readingsReducer(state, { type: "open", now: NOW });
    state = readingsReducer(state, { type: "error", now: NOW });
    expect(state.connection).toBe("reconnecting");

    state = readingsReducer(state, {
      type: "tick",
      now: new Date(2026, 10, 12, 14, 32, 25).getTime(),
    });
    expect(state.connection).toBe("no_data");
  });

  it("clears readings and events on reset and stays no_data", () => {
    let state = initReadings(
      snapshot([reading("2026-11-12T14:32:20")], [MORNING_EVENT]),
      NOW,
    );
    state = readingsReducer(state, { type: "open", now: NOW });
    state = readingsReducer(state, { type: "reset", now: NOW });

    expect(state.readings).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.connection).toBe("no_data");
    expect(state.secondsSinceLast).toBe(null);
    expect(state.streamOpen).toBe(true);
  });

  it("hydrates from the server snapshot and keeps a newer local reading", () => {
    let state = initReadings(snapshot([reading("2026-11-12T14:32:19")]), NOW);
    state = readingsReducer(state, { type: "open", now: NOW });
    state = readingsReducer(state, {
      type: "reading",
      reading: reading("2026-11-12T14:32:20"),
      now: NOW,
    });
    state = readingsReducer(state, {
      type: "hydrate",
      initial: snapshot([reading("2026-11-12T14:32:19")], [MORNING_EVENT]),
      now: NOW,
    });

    expect(state.readings.map((item) => item.timestamp)).toEqual([
      "2026-11-12T14:32:19",
      "2026-11-12T14:32:20",
    ]);
    expect(state.events).toEqual([MORNING_EVENT]);
    expect(state.streamOpen).toBe(true);
    expect(state.connection).toBe("live");
  });
});
