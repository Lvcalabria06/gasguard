import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Reading } from "@/types";

import { formatSse } from "./sse-format";

vi.mock("@/services/report/report-service", () => ({
  watchReadings: vi.fn(),
}));

import { watchReadings } from "@/services/report/report-service";
import { GET } from "./route";

const READING: Reading = {
  timestamp: "2026-11-10T14:32:08",
  source: "mock",
  level: "NORMAL",
  scenarioId: 0,
  mq6: { value: 200, base: 180, level: 0 },
  mq2: { value: 150, base: 140, level: 0 },
  flame: false,
  temperature: { celsius: 24, limit: 26, high: false },
  motion: true,
  stoveOn: false,
  secondsWithoutMotion: 0,
};

type WatchHandlers = {
  onReading: (reading: Reading) => void;
  onReset: () => void;
};

const watch = vi.mocked(watchReadings);

let abort: AbortController | undefined;
let stop: ReturnType<typeof vi.fn<() => void>>;
let handlers: WatchHandlers | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  stop = vi.fn<() => void>();
  handlers = undefined;
  watch.mockImplementation((next) => {
    handlers = next;
    return stop;
  });
});

afterEach(() => {
  abort?.abort();
  abort = undefined;
  vi.useRealTimers();
  vi.clearAllMocks();
});

async function openStream(): Promise<Response> {
  abort = new AbortController();
  return GET(new Request("http://localhost/api/stream", { signal: abort.signal }));
}

describe("GET /api/stream", () => {
  it("returns the frozen SSE headers", async () => {
    const response = await openStream();

    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(response.headers.get("connection")).toBe("keep-alive");
  });

  it("sends nothing on connect — no ping, no dumped history", async () => {
    const response = await openStream();
    vi.advanceTimersByTime(14_999);
    abort?.abort();

    expect(watch).toHaveBeenCalledTimes(1);
    expect(await response.text()).toBe("");
  });

  it("writes reading, ping at 15s, and reset frames", async () => {
    const response = await openStream();

    handlers?.onReading(READING);
    vi.advanceTimersByTime(15_000);
    handlers?.onReset();
    abort?.abort();

    const text = await response.text();
    expect(text).toContain(formatSse("reading", JSON.stringify(READING)));
    expect(text).toContain(formatSse("ping"));
    expect(text).toContain(formatSse("reset"));
    expect(text).not.toMatch(/\nid:/);
  });

  it("stops the watcher and the ping interval on abort", async () => {
    const response = await openStream();
    abort?.abort();
    await response.text();

    expect(stop).toHaveBeenCalledTimes(1);

    handlers?.onReading(READING);
    vi.advanceTimersByTime(15_000);
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
