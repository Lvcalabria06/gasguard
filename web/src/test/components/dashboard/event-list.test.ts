import { describe, expect, it } from "vitest";

import { getScenario } from "@/lib/scenarios";
import type { EventFilterState, ReportEvent, RiskLevel } from "@/types";

import { eventListView } from "./event-list";

function event(
  timestamp: string,
  to: RiskLevel,
  extras: Partial<Pick<ReportEvent, "from" | "scenarioId" | "source">> = {},
): ReportEvent {
  return {
    id: timestamp,
    timestamp,
    from: extras.from === undefined ? "NORMAL" : extras.from,
    to,
    scenarioId: extras.scenarioId ?? 0,
    source: extras.source ?? "mock",
  };
}

const NOON = new Date(2026, 10, 12, 12, 0, 0);
const TODAY: EventFilterState = { levels: [], period: "today" };

describe("eventListView", () => {
  it("returns no rows when there are no events", () => {
    expect(eventListView([], TODAY, NOON)).toEqual([]);
  });

  it("puts the newest matching event first and drops other calendar days", () => {
    const morning = event("2026-11-12T08:00:00", "ATTENTION");
    const noon = event("2026-11-12T12:00:00", "ALERT");
    const yesterday = event("2026-11-11T12:00:00", "HIGH");

    expect(
      eventListView([morning, noon, yesterday], TODAY, NOON).map((row) => row.id),
    ).toEqual(["2026-11-12T12:00:00", "2026-11-12T08:00:00"]);
  });

  it("filters by event.to, not from", () => {
    const recovered = event("2026-11-12T11:00:00", "NORMAL", { from: "ALERT" });
    const noonAlert = event("2026-11-12T12:00:00", "ALERT");
    const onlyAlert: EventFilterState = { levels: ["ALERT"], period: "today" };

    expect(
      eventListView([recovered, noonAlert], onlyAlert, NOON).map((row) => row.id),
    ).toEqual(["2026-11-12T12:00:00"]);
  });

  it("maps time, pt-BR labels, scenario title and to-color, with a dash when from is null", () => {
    const rows = eventListView(
      [
        event("2026-11-12T14:32:08", "ALERT", {
          from: null,
          scenarioId: 7,
        }),
        event("2026-11-12T14:32:09", "ALERT", { scenarioId: 99 }),
      ],
      TODAY,
      new Date(2026, 10, 12, 14, 32, 10),
    );

    expect(rows[0]).toEqual({
      id: "2026-11-12T14:32:09",
      time: "14:32:09",
      fromLabel: "Normal",
      toLabel: "Alerta",
      title: getScenario(99).title,
      toneClass: "bg-orange-500",
    });
    expect(rows[0].title).toBe("Cenário desconhecido");
    expect(rows[1]).toMatchObject({
      id: "2026-11-12T14:32:08",
      time: "14:32:08",
      fromLabel: "—",
      toLabel: "Alerta",
      title: getScenario(7).title,
      toneClass: "bg-orange-500",
    });
  });

  it("uses filterEvents local windows instead of reimplementing them", () => {
    const now = new Date(2026, 10, 13, 0, 30, 0);
    const lastNight = event("2026-11-12T23:45:00", "ALERT");
    const tonight = event("2026-11-13T00:10:00", "ALERT");
    const sample = [lastNight, tonight];

    expect(
      eventListView(sample, { levels: [], period: "today" }, now).map(
        (row) => row.id,
      ),
    ).toEqual(["2026-11-13T00:10:00"]);
    expect(
      eventListView(sample, { levels: [], period: "last-hour" }, now).map(
        (row) => row.id,
      ),
    ).toEqual(["2026-11-13T00:10:00", "2026-11-12T23:45:00"]);
  });
});
