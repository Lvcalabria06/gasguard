import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {}),
}));

vi.mock("@/services/report/report-service", () => ({
  getRecentReadings: vi.fn(),
}));

const { getSessionUser } = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/services/auth/get-session", () => ({
  getSessionUser,
}));

vi.mock("@/app/login/actions", () => ({
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
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
import { redirect } from "next/navigation";

import Home from "@/app/page";

type HomeElement = {
  type: unknown;
  props: {
    initial: RecentReadings | null;
    user: { name: string; email: string };
    signOutAction: unknown;
  };
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
    getSessionUser.mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("does not read the CSV until connection() resolves", async () => {
    getSessionUser.mockResolvedValue({
      name: "Ada",
      email: "ada@example.com",
    });
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
    expect(getSessionUser).not.toHaveBeenCalled();

    release();
    const ui = (await pending) as HomeElement;

    expect(getSessionUser).toHaveBeenCalledOnce();
    expect(getRecent).toHaveBeenCalledOnce();
    expect(ui.type).toBe(Dashboard);
    expect(ui.props.initial).toBeNull();
    expect(ui.props.user).toEqual({
      name: "Ada",
      email: "ada@example.com",
    });
  });

  it("passes the snapshot and user to Dashboard", async () => {
    getRecent.mockResolvedValue(SNAPSHOT);
    getSessionUser.mockResolvedValue({
      name: "Ada",
      email: "ada@example.com",
    });

    const ui = (await Home()) as HomeElement;

    expect(ui.type).toBe(Dashboard);
    expect(ui.props.initial).toBe(SNAPSHOT);
    expect(ui.props.user).toEqual({
      name: "Ada",
      email: "ada@example.com",
    });
  });

  it("redirects to login when there is no session", async () => {
    getSessionUser.mockResolvedValue(null);
    await expect(Home()).rejects.toThrow("REDIRECT:/login");
    expect(getRecent).not.toHaveBeenCalled();
  });
});
