import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {}),
}));

vi.mock("@/services/report/report-service", () => ({
  getRecentReadings: vi.fn(),
}));

vi.mock("@/services/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/components/dashboard/dashboard", () => ({
  Dashboard: function Dashboard() {
    return null;
  },
}));

import { Dashboard } from "@/components/dashboard/dashboard";
import { getSession } from "@/services/auth/session";
import { getRecentReadings } from "@/services/report/report-service";
import type { RecentReadings } from "@/types";
import { connection } from "next/server";

import Home from "./page";

type HomeElement = {
  type: unknown;
  props: { initial: RecentReadings | null; email: string | null };
};

const getRecent = vi.mocked(getRecentReadings);
const readSession = vi.mocked(getSession);
const waitForRequest = vi.mocked(connection);

const SNAPSHOT: RecentReadings = {
  date: "2026-11-12",
  readings: [],
  events: [],
};

describe("Home", () => {
  beforeEach(() => {
    waitForRequest.mockReset();
    waitForRequest.mockResolvedValue(undefined);
    getRecent.mockReset();
    getRecent.mockResolvedValue(null);
    readSession.mockReset();
    readSession.mockResolvedValue(null);
  });

  it("does not read the CSV or the session until connection() resolves", async () => {
    let release = () => {};
    waitForRequest.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const pending = Home();
    await Promise.resolve();

    expect(waitForRequest).toHaveBeenCalledOnce();
    expect(getRecent).not.toHaveBeenCalled();
    expect(readSession).not.toHaveBeenCalled();

    release();
    const ui = (await pending) as HomeElement;

    expect(getRecent).toHaveBeenCalledOnce();
    expect(readSession).toHaveBeenCalledOnce();
    expect(ui.type).toBe(Dashboard);
    expect(ui.props.initial).toBeNull();
    expect(ui.props.email).toBeNull();
  });

  it("passes the snapshot and session email to Dashboard", async () => {
    getRecent.mockResolvedValue(SNAPSHOT);
    readSession.mockResolvedValue({ email: "ada@example.com" });

    const ui = (await Home()) as HomeElement;

    expect(ui.type).toBe(Dashboard);
    expect(ui.props.initial).toBe(SNAPSHOT);
    expect(ui.props.email).toBe("ada@example.com");
  });

  it("passes email=null when getSession returns null", async () => {
    const ui = (await Home()) as unknown as HomeElement;
    expect(ui.props.email).toBeNull();
  });
});
