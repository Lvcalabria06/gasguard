import { afterEach, describe, expect, it, vi } from "vitest";

import type { Reading, RecentReadings, ReportEvent, RiskLevel } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import {
  bindReadingsStream,
  initReadings,
  readingsReducer,
  useReadings,
} from "./use-readings";

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

class FakeStream {
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;
  private listeners = new Map<string, Set<(event: MessageEvent) => void>>();

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: string) {
    const event = { data } as MessageEvent;
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

describe("bindReadingsStream", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches a parsed reading and ignores ping and bad json", () => {
    const source = new FakeStream();
    const dispatch = vi.fn();
    const refresh = vi.fn();
    bindReadingsStream({
      source,
      dispatch,
      refresh,
      now: () => NOW,
    });

    source.emit("reading", JSON.stringify(reading("2026-11-12T14:32:20")));
    source.emit("ping", "");
    source.emit("reading", "{");
    source.emit("reading", "null");
    source.emit("reading", JSON.stringify({ level: "NORMAL" }));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: "reading",
      reading: reading("2026-11-12T14:32:20"),
      now: NOW,
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("dispatches reset and calls refresh on the reset event", () => {
    const source = new FakeStream();
    const dispatch = vi.fn();
    const refresh = vi.fn();
    bindReadingsStream({
      source,
      dispatch,
      refresh,
      now: () => NOW,
    });

    source.emit("reset", "");

    expect(dispatch).toHaveBeenCalledWith({ type: "reset", now: NOW });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh on the first open, and refreshes on open after error", () => {
    const source = new FakeStream();
    const dispatch = vi.fn();
    const refresh = vi.fn();
    bindReadingsStream({
      source,
      dispatch,
      refresh,
      now: () => NOW,
    });

    source.onopen?.(new Event("open"));
    expect(dispatch).toHaveBeenCalledWith({ type: "open", now: NOW });
    expect(refresh).not.toHaveBeenCalled();

    source.onerror?.(new Event("error"));
    expect(dispatch).toHaveBeenCalledWith({ type: "error", now: NOW });

    source.onopen?.(new Event("open"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("closes the source on unbind and ignores later events", () => {
    const source = new FakeStream();
    const dispatch = vi.fn();
    const refresh = vi.fn();
    const unbind = bindReadingsStream({
      source,
      dispatch,
      refresh,
      now: () => NOW,
    });

    unbind();
    source.emit("reset", "");
    source.emit("reading", JSON.stringify(reading("2026-11-12T14:32:20")));

    expect(source.closed).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("useReadings", () => {
  it("is the frozen client entry that W4 will call", () => {
    expect(typeof useReadings).toBe("function");
  });
});
