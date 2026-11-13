import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/services/report/report-service", () => ({
  watchReadings: vi.fn(),
}));

vi.mock("@/services/auth/users", () => ({
  listUsers: vi.fn(() => []),
}));

import { listUsers } from "@/services/auth/users";
import { watchReadings } from "@/services/report/report-service";
import type { Reading, RiskLevel } from "@/types";

import {
  handleCriticalReading,
  shouldStartAlertWatcher,
  startAlertWatcher,
} from "./alert-watcher";

function reading(
  level: RiskLevel,
  source: Reading["source"] = "mock",
): Reading {
  return {
    timestamp: "2026-11-12T14:32:08",
    source,
    level,
    scenarioId: 1,
    mq6: { value: 1120, base: 290, level: 2 },
    mq2: { value: 1350, base: 900, level: 1 },
    flame: true,
    temperature: { celsius: 29.1, limit: 28.4, high: true },
    motion: false,
    stoveOn: true,
    secondsWithoutMotion: 42,
  };
}

const send = vi.fn<(...args: unknown[]) => Promise<boolean>>();
const lastSent = new Map<string, number>();

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue(true);
  lastSent.clear();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("shouldStartAlertWatcher", () => {
  it("runs only on the Node server, never during next build", () => {
    expect(shouldStartAlertWatcher("nodejs", "phase-development-server")).toBe(
      true,
    );
    expect(shouldStartAlertWatcher("nodejs", "phase-production-server")).toBe(
      true,
    );
    expect(shouldStartAlertWatcher("nodejs", "phase-production-build")).toBe(
      false,
    );
    expect(shouldStartAlertWatcher("edge", "phase-development-server")).toBe(
      false,
    );
    expect(shouldStartAlertWatcher(undefined, undefined)).toBe(false);
  });
});

describe("handleCriticalReading", () => {
  it("logs and skips fetch when there are no users", async () => {
    await handleCriticalReading({
      previousLevel: "HIGH",
      reading: reading("CRITICAL"),
      now: 1_000,
      users: [],
      lastSent,
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
      send,
    });
    expect(console.info).toHaveBeenCalledWith("[alerts] no users; skip");
    expect(send).not.toHaveBeenCalled();
  });

  it("logs and skips fetch when RESEND_API_KEY is missing", async () => {
    await handleCriticalReading({
      previousLevel: "HIGH",
      reading: reading("CRITICAL"),
      now: 1_000,
      users: [{ email: "ada@example.com" }],
      lastSent,
      apiKey: undefined,
      from: "GasGuard <alertas@localhost>",
      send,
    });
    expect(console.info).toHaveBeenCalledWith(
      "[alerts] RESEND_API_KEY missing; skip",
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("does not send while the level stays CRITICAL", async () => {
    await handleCriticalReading({
      previousLevel: "CRITICAL",
      reading: reading("CRITICAL"),
      now: 1_000,
      users: [{ email: "ada@example.com" }],
      lastSent,
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
      send,
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends to each user and throttles the same address for 5 minutes", async () => {
    const users = [
      { email: "ada@example.com" },
      { email: "bob@example.com" },
    ];
    const first = reading("CRITICAL", "mock");

    await handleCriticalReading({
      previousLevel: "HIGH",
      reading: first,
      now: 10_000,
      users,
      lastSent,
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
      send,
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenNthCalledWith(1, {
      to: "ada@example.com",
      subject: "[SIMULAÇÃO] GasGuard: risco crítico",
      text: expect.stringContaining("Nível: Crítico"),
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
    });
    expect(lastSent.get("ada@example.com")).toBe(10_000);

    send.mockClear();
    await handleCriticalReading({
      previousLevel: "NORMAL",
      reading: reading("CRITICAL", "board"),
      now: 10_000 + 5 * 60 * 1000 - 1,
      users,
      lastSent,
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
      send,
    });
    expect(send).not.toHaveBeenCalled();

    send.mockClear();
    await handleCriticalReading({
      previousLevel: "NORMAL",
      reading: reading("CRITICAL", "board"),
      now: 10_000 + 5 * 60 * 1000,
      users,
      lastSent,
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
      send,
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      subject: "GasGuard: risco crítico",
    });
  });

  it("does not record lastSent when send returns false", async () => {
    send.mockResolvedValue(false);
    await handleCriticalReading({
      previousLevel: null,
      reading: reading("CRITICAL"),
      now: 1_000,
      users: [{ email: "ada@example.com" }],
      lastSent,
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
      send,
    });
    expect(lastSent.has("ada@example.com")).toBe(false);
  });
});

describe("startAlertWatcher", () => {
  type WatchHandlers = {
    onReading: (reading: Reading) => void;
    onReset: () => void;
  };

  const watch = vi.mocked(watchReadings);
  const users = vi.mocked(listUsers);
  let handlers: WatchHandlers | undefined;
  const stop = vi.fn();

  beforeEach(() => {
    handlers = undefined;
    stop.mockReset();
    watch.mockImplementation((next) => {
      handlers = next;
      return stop;
    });
    users.mockReturnValue([{ email: "ada@example.com", passwordHash: "x:y" }]);
  });

  it("updates previous before awaiting send so a second CRITICAL in the same tick is silent", async () => {
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    send.mockImplementation(async () => {
      await pending;
      return true;
    });

    vi.stubEnv("RESEND_API_KEY", "re_test");
    startAlertWatcher(send);

    handlers?.onReading(reading("CRITICAL"));
    handlers?.onReading(reading("CRITICAL"));
    release();
    await Promise.resolve();
    await Promise.resolve();

    expect(send).toHaveBeenCalledOnce();
  });

  it("treats onReset as previous=null so the next CRITICAL notifies again", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const now = 1_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
    startAlertWatcher(send);

    handlers?.onReading(reading("CRITICAL"));
    await Promise.resolve();
    await Promise.resolve();
    expect(send).toHaveBeenCalledOnce();

    handlers?.onReset();
    send.mockClear();
    nowSpy.mockReturnValue(now + 5 * 60 * 1000);
    handlers?.onReading(reading("CRITICAL"));
    await Promise.resolve();
    await Promise.resolve();
    expect(send).toHaveBeenCalledOnce();
  });
});
