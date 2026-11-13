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

function ageSeconds(timestamp: string | undefined, now: number): number | null {
  if (!timestamp) return null;
  const then = parseLocalIso(timestamp);
  if (!then) return null;
  return Math.max(0, Math.floor((now - then.getTime()) / 1000));
}

function view(
  readings: Reading[],
  events: ReportEvent[],
  streamOpen: boolean,
  now: number,
): ReadingsState {
  const secondsSinceLast = ageSeconds(
    readings[readings.length - 1]?.timestamp,
    now,
  );
  const connection: ConnectionStatus =
    secondsSinceLast === null || secondsSinceLast >= STALE_SECONDS
      ? "no_data"
      : streamOpen
        ? "live"
        : "reconnecting";
  return { readings, events, connection, secondsSinceLast, streamOpen };
}

export function initReadings(
  initial: RecentReadings | null,
  now: number,
): ReadingsState {
  return view(
    keepLastMinutes(initial?.readings ?? []),
    initial?.events ?? [],
    false,
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
        action.now,
      );
    case "open":
      return view(state.readings, state.events, true, action.now);
    case "error":
      return view(state.readings, state.events, false, action.now);
    case "reset":
      return view([], [], state.streamOpen, action.now);
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
      return view(readings, events, state.streamOpen, action.now);
    }
    case "reading": {
      const last = state.readings[state.readings.length - 1]?.timestamp;
      if (last !== undefined && action.reading.timestamp <= last) {
        return view(
          state.readings,
          state.events,
          state.streamOpen,
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
