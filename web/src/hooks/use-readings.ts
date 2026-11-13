import { detectEvents } from "@/lib/events";
import type {
  ConnectionStatus,
  Reading,
  RecentReadings,
  ReportEvent,
} from "@/types";

const STALE_SECONDS = 5;
const WINDOW_MS = 10 * 60 * 1000;

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

function parseLocalIso(iso: string): Date | null {
  const [datePart, timePart] = iso.split("T");
  if (
    !datePart ||
    !timePart ||
    timePart.includes("Z") ||
    timePart.includes("+")
  ) {
    return null;
  }
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  if (
    [year, month, day, hour, minute, second].some(
      (value) => !Number.isFinite(value),
    )
  ) {
    return null;
  }
  return new Date(year, month - 1, day, hour, minute, second);
}

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
