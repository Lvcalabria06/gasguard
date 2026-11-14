import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import type { EventFilterState, Reading, RiskLevel } from "@/types";

import { DEFAULT_EVENT_FILTER } from "./event-filters";
import {
  ACADEMIC_FOOTER,
  dashboardView,
  latestReading,
  liveReading,
} from "./dashboard";

function reading(
  timestamp: string,
  level: RiskLevel = "NORMAL",
): Reading {
  return {
    timestamp,
    source: "mock",
    level,
    scenarioId: 0,
    mq6: { value: 200, base: 180, level: 0 },
    mq2: { value: 150, base: 140, level: 0 },
    flame: false,
    temperature: { celsius: 24, limit: 35, high: false },
    motion: true,
    stoveOn: false,
    secondsWithoutMotion: 0,
  };
}

describe("latestReading", () => {
  it("returns null when there are no readings", () => {
    expect(latestReading([])).toBeNull();
  });

  it("returns the last chronological reading, not the first", () => {
    const first = reading("2026-11-12T14:31:00", "CRITICAL");
    const last = reading("2026-11-12T14:32:08", "NORMAL");

    expect(latestReading([first, last])).toBe(last);
    expect(latestReading([first, last])).not.toBe(first);
  });
});

describe("liveReading", () => {
  it("hides the last metrics when the stream is stale", () => {
    const stale = reading("2026-11-12T14:32:00", "NORMAL");
    expect(liveReading(stale, "no_data")).toBeNull();
    expect(liveReading(stale, "live")).toBe(stale);
    expect(liveReading(stale, "reconnecting")).toBe(stale);
  });
});

describe("dashboardView", () => {
  it("keeps an old NORMAL latest instead of inventing a blank reading", () => {
    const stale = reading("2026-11-12T14:32:00", "NORMAL");
    const view = dashboardView([stale], DEFAULT_EVENT_FILTER);

    expect(view.latest).toBe(stale);
    expect(view.latest?.level).toBe("NORMAL");
  });

  it("uses the academic footer and the default today filter", () => {
    const filter: EventFilterState = { levels: ["ALERT"], period: "last-hour" };
    const view = dashboardView([], filter);

    expect(view.latest).toBeNull();
    expect(view.readings).toEqual([]);
    expect(view.filter).toBe(filter);
    expect(view.footer).toBe(
      "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.",
    );
    expect(view.footer).toBe(ACADEMIC_FOOTER);
    expect(DEFAULT_EVENT_FILTER).toEqual({ levels: [], period: "today" });
  });
});
