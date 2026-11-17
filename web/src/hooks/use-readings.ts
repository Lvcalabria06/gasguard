"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef } from "react";

import { detectEvents } from "@/lib/events";
import { parseLocalIso } from "@/lib/format";
import type {
  ConnectionStatus,
  Reading,
  RecentReadings,
  ReportEvent,
} from "@/types";

const STALE_SECONDS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const TICK_MS = 1000;

export type ReadingsState = {
  readings: Reading[];
  events: ReportEvent[];
  connection: ConnectionStatus;
  secondsSinceLast: number | null;
  streamOpen: boolean;
  /**
   * When the last reading reached this browser, in this browser's clock.
   * Staleness is measured from here, never by comparing `timestamp` (the PC's clock)
   * with the phone's clock, which may be seconds apart.
   */
  lastArrivalAt: number | null;
};

export type ReadingsAction =
  | { type: "hydrate"; initial: RecentReadings | null; now: number }
  | { type: "reading"; reading: Reading; now: number }
  | { type: "tick"; now: number }
  | { type: "open"; now: number }
  | { type: "error"; now: number }
  | { type: "reset"; now: number };

export type ReadingsSource = {
  addEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void;
  close(): void;
  /** EventSource.readyState: 2 (CLOSED) means the browser gave up reconnecting. */
  readonly readyState?: number;
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
};

function keepLastMinutes(readings: Reading[]): Reading[] {
  if (readings.length === 0) return [];
  const latest = parseLocalIso(readings[readings.length - 1].timestamp);
  if (!latest) return readings;
  const earliest = latest.getTime() - WINDOW_MS;
  return readings.filter((item) => {
    const at = parseLocalIso(item.timestamp);
    return at !== null && at.getTime() >= earliest;
  });
}

const EVENT_SOURCE_CLOSED = 2;

/** Arrival time of the snapshot's last reading, in the browser's clock. */
function snapshotArrivalAt(
  initial: RecentReadings | null,
  readings: Reading[],
  now: number,
): number | null {
  const last = readings[readings.length - 1];
  if (!last) return null;
  if (typeof initial?.lastReadingAgeMs === "number") {
    return now - initial.lastReadingAgeMs;
  }
  // Older payload without the server-measured age: fall back to the timestamp.
  return parseLocalIso(last.timestamp)?.getTime() ?? null;
}

function view(
  readings: Reading[],
  events: ReportEvent[],
  streamOpen: boolean,
  lastArrivalAt: number | null,
  now: number,
): ReadingsState {
  const secondsSinceLast =
    readings.length === 0 || lastArrivalAt === null
      ? null
      : Math.max(0, Math.floor((now - lastArrivalAt) / 1000));
  const connection: ConnectionStatus =
    secondsSinceLast === null || secondsSinceLast >= STALE_SECONDS
      ? "no_data"
      : streamOpen
        ? "live"
        : "reconnecting";
  return {
    readings,
    events,
    connection,
    secondsSinceLast,
    streamOpen,
    lastArrivalAt,
  };
}

export function initReadings(
  initial: RecentReadings | null,
  now: number,
): ReadingsState {
  const readings = keepLastMinutes(initial?.readings ?? []);
  return view(
    readings,
    initial?.events ?? [],
    false,
    snapshotArrivalAt(initial, readings, now),
    now,
  );
}

export function readingsReducer(
  state: ReadingsState,
  action: ReadingsAction,
): ReadingsState {
  switch (action.type) {
    case "tick":
      return view(
        state.readings,
        state.events,
        state.streamOpen,
        state.lastArrivalAt,
        action.now,
      );
    case "open":
      return view(
        state.readings,
        state.events,
        true,
        state.lastArrivalAt,
        action.now,
      );
    case "error":
      return view(
        state.readings,
        state.events,
        false,
        state.lastArrivalAt,
        action.now,
      );
    case "reset":
      return view([], [], state.streamOpen, null, action.now);
    case "hydrate": {
      const incoming = initReadings(action.initial, action.now);
      const lastReadingAt =
        incoming.readings[incoming.readings.length - 1]?.timestamp ?? "";
      const lastEventAt =
        incoming.events[incoming.events.length - 1]?.timestamp ?? "";
      const readings = keepLastMinutes([
        ...incoming.readings,
        ...state.readings.filter((item) => item.timestamp > lastReadingAt),
      ]);
      const events = [
        ...incoming.events,
        ...state.events.filter((item) => item.timestamp > lastEventAt),
      ];
      const keptLocal = state.readings.some(
        (item) => item.timestamp > lastReadingAt,
      );
      const lastArrivalAt = keptLocal
        ? Math.max(state.lastArrivalAt ?? 0, incoming.lastArrivalAt ?? 0)
        : incoming.lastArrivalAt;
      return view(readings, events, state.streamOpen, lastArrivalAt, action.now);
    }
    case "reading": {
      const last = state.readings[state.readings.length - 1]?.timestamp;
      if (last !== undefined && action.reading.timestamp <= last) {
        return view(
          state.readings,
          state.events,
          state.streamOpen,
          state.lastArrivalAt,
          action.now,
        );
      }
      const previous = state.readings[state.readings.length - 1];
      const readings = keepLastMinutes([...state.readings, action.reading]);
      const extra = previous
        ? detectEvents([previous, action.reading])
        : [];
      return view(
        readings,
        extra.length === 0 ? state.events : [...state.events, ...extra],
        state.streamOpen,
        action.now,
        action.now,
      );
    }
  }
}

function parseReading(data: string): Reading | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { timestamp?: unknown }).timestamp !== "string"
    ) {
      return null;
    }
    return parsed as Reading;
  } catch {
    return null;
  }
}

export function bindReadingsStream(args: {
  source: ReadingsSource;
  dispatch: (action: ReadingsAction) => void;
  refresh: () => void;
  now: () => number;
}): () => void {
  const { source, dispatch, refresh, now } = args;
  let seenError = false;

  const onReading = (event: MessageEvent) => {
    const reading = parseReading(event.data);
    if (reading === null) return;
    dispatch({ type: "reading", reading, now: now() });
  };

  const onReset = () => {
    dispatch({ type: "reset", now: now() });
    refresh();
  };

  source.addEventListener("reading", onReading);
  source.addEventListener("reset", onReset);

  source.onopen = () => {
    dispatch({ type: "open", now: now() });
    if (!seenError) return;
    seenError = false;
    refresh();
  };

  source.onerror = () => {
    seenError = true;
    dispatch({ type: "error", now: now() });
    // The browser only stops retrying on a non-SSE answer, e.g. 401 after the session expired.
    // Refreshing re-runs the page on the server, which redirects to /login without a session.
    if (source.readyState === EVENT_SOURCE_CLOSED) refresh();
  };

  return () => {
    source.removeEventListener("reading", onReading);
    source.removeEventListener("reset", onReset);
    source.onopen = null;
    source.onerror = null;
    source.close();
  };
}

export function useReadings(initial: RecentReadings | null): {
  readings: Reading[];
  events: ReportEvent[];
  connection: ConnectionStatus;
  secondsSinceLast: number | null;
} {
  const router = useRouter();
  const initialRef = useRef(initial);
  const [state, dispatch] = useReducer(
    readingsReducer,
    initial,
    (value) => initReadings(value, Date.now()),
  );

  useEffect(() => {
    if (initialRef.current === initial) return;
    initialRef.current = initial;
    dispatch({ type: "hydrate", initial, now: Date.now() });
  }, [initial]);

  useEffect(() => {
    const source = new EventSource("/api/stream") as ReadingsSource;
    const unbind = bindReadingsStream({
      source,
      dispatch,
      refresh: () => router.refresh(),
      now: () => Date.now(),
    });
    const tickId = setInterval(
      () => dispatch({ type: "tick", now: Date.now() }),
      TICK_MS,
    );
    return () => {
      unbind();
      clearInterval(tickId);
    };
  }, [router]);

  return {
    readings: state.readings,
    events: state.events,
    connection: state.connection,
    secondsSinceLast: state.secondsSinceLast,
  };
}
