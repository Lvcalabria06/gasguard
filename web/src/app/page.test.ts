import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {}),
}));

vi.mock("@/services/report/report-service", () => ({
  getRecentReadings: vi.fn(),
}));

vi.mock("@/components/dashboard/dashboard", () => ({
  Dashboard: function Dashboard() {
    return null;
  },
}));

import { Dashboard } from "@/components/dashboard/dashboard";
import { getRecentReadings } from "@/services/report/report-service";
import type { RecentReadings } from "@/types";
import { connection } from "next/server";

import Home from "./page";

type HomeElement = {
  type: unknown;
  props: { initial: RecentReadings | null };
};

const getRecent = vi.mocked(getRecentReadings);
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
  });

  it("does not read the CSV until connection() resolves", async () => {
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

    release();
    const ui = (await pending) as HomeElement;

    expect(getRecent).toHaveBeenCalledOnce();
    expect(ui.type).toBe(Dashboard);
    expect(ui.props.initial).toBeNull();
  });

  it("passes the snapshot from getRecentReadings to Dashboard", async () => {
    getRecent.mockResolvedValue(SNAPSHOT);

    const ui = (await Home()) as HomeElement;

    expect(ui.type).toBe(Dashboard);
    expect(ui.props.initial).toBe(SNAPSHOT);
  });
});
