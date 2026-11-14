import { describe, expect, it } from "vitest";

import { RISK_LEVELS } from "@/lib/risk-level";
import type { EventFilterState } from "@/types";

import {
  DEFAULT_EVENT_FILTER,
  filterView,
  setFilterPeriod,
  toggleFilterLevel,
} from "./event-filters";

describe("filterView", () => {
  it("lists every level and period label, with Hoje selected and no level pressed", () => {
    const view = filterView(DEFAULT_EVENT_FILTER);

    expect(view.title).toBe("Eventos do dia");
    expect(DEFAULT_EVENT_FILTER).toEqual({ levels: [], period: "today" });
    expect(view.levels.map((chip) => chip.id)).toEqual([...RISK_LEVELS]);
    expect(view.levels.map((chip) => chip.label)).toEqual([
      "Normal",
      "Atenção",
      "Alerta",
      "Alto",
      "Crítico",
      "Falha",
    ]);
    expect(view.levels.every((chip) => chip.selected === false)).toBe(true);
    expect(view.periods).toEqual([
      { id: "last-hour", label: "Última hora", selected: false },
      { id: "last-6h", label: "Últimas 6 h", selected: false },
      { id: "today", label: "Hoje", selected: true },
    ]);
  });

  it("marks only the levels in value and the active period", () => {
    const view = filterView({
      levels: ["ALERT", "CRITICAL"],
      period: "last-hour",
    });

    expect(view.levels.filter((chip) => chip.selected).map((chip) => chip.id)).toEqual(
      ["ALERT", "CRITICAL"],
    );
    expect(view.periods.find((chip) => chip.id === "last-hour")?.selected).toBe(
      true,
    );
    expect(view.periods.find((chip) => chip.id === "today")?.selected).toBe(
      false,
    );
  });
});

describe("toggleFilterLevel", () => {
  it("adds and removes levels in RISK_LEVELS order without changing the period", () => {
    const start: EventFilterState = DEFAULT_EVENT_FILTER;
    const withAlert = toggleFilterLevel(start, "ALERT");
    expect(withAlert).toEqual({ levels: ["ALERT"], period: "today" });

    const withHigh = toggleFilterLevel(withAlert, "HIGH");
    expect(withHigh.levels).toEqual(["ALERT", "HIGH"]);

    const withNormal = toggleFilterLevel(withHigh, "NORMAL");
    expect(withNormal.levels).toEqual(["NORMAL", "ALERT", "HIGH"]);

    const withoutAlert = toggleFilterLevel(withNormal, "ALERT");
    expect(withoutAlert).toEqual({
      levels: ["NORMAL", "HIGH"],
      period: "today",
    });
  });
});

describe("setFilterPeriod", () => {
  it("changes only the period", () => {
    const value: EventFilterState = { levels: ["HIGH"], period: "today" };

    expect(setFilterPeriod(value, "last-6h")).toEqual({
      levels: ["HIGH"],
      period: "last-6h",
    });
    expect(setFilterPeriod(value, "today")).toEqual(value);
  });
});
