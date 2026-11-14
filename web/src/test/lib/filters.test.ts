import { describe, expect, it } from "vitest";
import { filterEvents } from "@/lib/filters";
import type { EventFilterState, ReportEvent, RiskLevel } from "@/types";

function event(
  timestamp: string,
  to: RiskLevel,
  extras: Partial<Pick<ReportEvent, "from" | "scenarioId" | "source">> = {},
): ReportEvent {
  return {
    id: timestamp,
    timestamp,
    from: extras.from ?? "NORMAL",
    to,
    scenarioId: extras.scenarioId ?? 0,
    source: extras.source ?? "mock",
  };
}

const NOON = new Date(2026, 10, 12, 12, 0, 0);

function filter(
  events: ReportEvent[],
  patch: Partial<EventFilterState> = {},
  now: Date = NOON,
): ReportEvent[] {
  return filterEvents(events, { levels: [], period: "today", ...patch }, now);
}

describe("filterEvents", () => {
  const morning = event("2026-11-12T08:00:00", "ATTENTION");
  const noonAlert = event("2026-11-12T12:00:00", "ALERT");
  const yesterday = event("2026-11-11T12:00:00", "HIGH");
  const sample = [morning, noonAlert, yesterday];

  it("keeps every event when levels is empty, in input order", () => {
    expect(filter(sample, { period: "today" }).map((item) => item.id)).toEqual([
      "2026-11-12T08:00:00",
      "2026-11-12T12:00:00",
    ]);
  });

  it("filters by event.to, not from", () => {
    const recovered = event("2026-11-12T11:00:00", "NORMAL", { from: "ALERT" });
    const onlyAlert = filter([recovered, noonAlert], { levels: ["ALERT"] });
    expect(onlyAlert.map((item) => item.id)).toEqual(["2026-11-12T12:00:00"]);
    const onlyNormal = filter([recovered, noonAlert], { levels: ["NORMAL"] });
    expect(onlyNormal.map((item) => item.id)).toEqual(["2026-11-12T11:00:00"]);
  });

  it("ANDs level chips with the period", () => {
    const result = filter(sample, { levels: ["HIGH"], period: "today" });
    expect(result).toEqual([]);
  });

  it("includes the last-hour boundary and keeps order", () => {
    const now = new Date(2026, 10, 12, 12, 0, 0);
    const hourAgo = event("2026-11-12T11:00:00", "ALERT");
    const older = event("2026-11-12T10:59:59", "ALERT");
    const newer = event("2026-11-12T11:30:00", "HIGH");
    expect(
      filter([older, hourAgo, newer], { period: "last-hour" }, now).map((item) => item.id),
    ).toEqual(["2026-11-12T11:00:00", "2026-11-12T11:30:00"]);
  });

  it("includes the last-6h window", () => {
    const now = new Date(2026, 10, 12, 12, 0, 0);
    const sixHoursAgo = event("2026-11-12T06:00:00", "ATTENTION");
    const older = event("2026-11-12T05:59:59", "ATTENTION");
    expect(
      filter([older, sixHoursAgo], { period: "last-6h" }, now).map((item) => item.id),
    ).toEqual(["2026-11-12T06:00:00"]);
  });

  it("treats today as the local calendar date of now, not last-hour", () => {
    const now = new Date(2026, 10, 13, 0, 30, 0);
    const lastNight = event("2026-11-12T23:45:00", "ALERT");
    const tonight = event("2026-11-13T00:10:00", "ALERT");
    const yesterdayMorning = event("2026-11-12T10:00:00", "ALERT");
    expect(
      filter([lastNight, tonight, yesterdayMorning], { period: "today" }, now).map(
        (item) => item.id,
      ),
    ).toEqual(["2026-11-13T00:10:00"]);
    expect(
      filter([lastNight, tonight, yesterdayMorning], { period: "last-hour" }, now).map(
        (item) => item.id,
      ),
    ).toEqual(["2026-11-12T23:45:00", "2026-11-13T00:10:00"]);
  });

  it("drops timestamps that are not local ISO without timezone", () => {
    const broken = event("not-a-timestamp", "ALERT");
    const zulu = event("2026-11-12T12:00:00Z", "ALERT");
    expect(filter([broken, zulu, noonAlert])).toEqual([noonAlert]);
  });
});
