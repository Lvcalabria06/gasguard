import { describe, expect, it } from "vitest";

import { formatGasDelta, formatTemperature } from "@/lib/format";
import type { Reading } from "@/types";

import { metricsView } from "./metrics-grid";

function reading(extras: Partial<Reading> = {}): Reading {
  return {
    timestamp: "2026-11-12T14:32:08",
    source: "board",
    level: "NORMAL",
    scenarioId: 0,
    mq6: { value: 200, base: 180, level: 0 },
    mq2: { value: 150, base: 140, level: 0 },
    flame: false,
    temperature: { celsius: 24, limit: 35, high: false },
    motion: true,
    stoveOn: false,
    secondsWithoutMotion: 0,
    ...extras,
  };
}

function item(
  view: ReturnType<typeof metricsView>,
  id: (typeof view)[number]["id"],
) {
  const found = view.find((row) => row.id === id);
  expect(found).toBeDefined();
  return found!;
}

describe("metricsView", () => {
  it("returns six labeled dashes and no hints when there is no reading", () => {
    const view = metricsView(null);

    expect(view.map((row) => row.id)).toEqual([
      "mq6",
      "mq2",
      "flame",
      "temperature",
      "motion",
      "stove",
    ]);
    expect(view.map((row) => row.label)).toEqual([
      "GLP (MQ-6)",
      "Gases / fumaça (MQ-2)",
      "Chama",
      "Temperatura",
      "Movimento",
      "Fogão",
    ]);
    expect(view.every((row) => row.value === "—" && row.hint === null)).toBe(
      true,
    );
    expect(view.some((row) => row.value === "Sem dados")).toBe(false);
  });

  it("shows MQ-6 with a signed delta and MQ-2 without one", () => {
    const view = metricsView(
      reading({
        mq6: { value: 1120, base: 290, level: 2 },
        mq2: { value: 1350, base: 900, level: 1 },
      }),
    );

    expect(item(view, "mq6")).toMatchObject({
      value: "1120",
      hint: formatGasDelta(1120, 290),
    });
    expect(item(view, "mq6").hint).toBe("+830");
    expect(item(view, "mq2")).toMatchObject({
      value: "1350",
      hint: null,
    });
  });

  it("keeps a +0 gas delta and does not hide a zero temperature", () => {
    const view = metricsView(
      reading({
        mq6: { value: 180, base: 180, level: 0 },
        temperature: { celsius: 0, limit: null, high: false },
      }),
    );

    expect(item(view, "mq6").hint).toBe("+0");
    expect(item(view, "temperature")).toMatchObject({
      value: "0 °C",
      hint: "limite —",
    });
  });

  it("formats flame, stove and temperature limit from the firmware fields", () => {
    const on = metricsView(
      reading({
        flame: true,
        stoveOn: true,
        temperature: { celsius: 29.1, limit: 28.4, high: true },
      }),
    );
    expect(item(on, "flame").value).toBe("Sim");
    expect(item(on, "stove").value).toBe("Ligado");
    expect(item(on, "temperature")).toMatchObject({
      value: formatTemperature(29.1),
      hint: `limite ${formatTemperature(28.4)}`,
    });
    expect(item(on, "temperature").hint).toBe("limite 28.4 °C");

    const off = metricsView(
      reading({
        flame: false,
        stoveOn: false,
        temperature: { celsius: null, limit: 28.4, high: false },
      }),
    );
    expect(item(off, "flame").value).toBe("Não");
    expect(item(off, "stove").value).toBe("Desligado");
    expect(item(off, "temperature")).toMatchObject({
      value: "—",
      hint: "limite 28.4 °C",
    });
  });

  it("uses the seconds-without-motion phrase only while the stove is on", () => {
    expect(
      item(
        metricsView(
          reading({
            stoveOn: true,
            motion: false,
            secondsWithoutMotion: 42,
          }),
        ),
        "motion",
      ).value,
    ).toBe("sem movimento há 42 s");

    expect(
      item(
        metricsView(
          reading({
            stoveOn: true,
            motion: true,
            secondsWithoutMotion: 0,
          }),
        ),
        "motion",
      ).value,
    ).toBe("sem movimento há 0 s");

    expect(
      item(
        metricsView(
          reading({
            stoveOn: false,
            motion: true,
            secondsWithoutMotion: 99,
          }),
        ),
        "motion",
      ).value,
    ).toBe("Com movimento");

    expect(
      item(
        metricsView(
          reading({
            stoveOn: false,
            motion: false,
            secondsWithoutMotion: 99,
          }),
        ),
        "motion",
      ).value,
    ).toBe("Sem movimento");
  });
});
