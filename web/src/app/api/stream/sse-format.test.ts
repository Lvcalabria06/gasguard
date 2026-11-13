import { describe, expect, it } from "vitest";

import type { Reading } from "@/types";

import { formatSse } from "./sse-format";

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

describe("formatSse", () => {
  it("formats a reading as event + JSON data + blank line, without id", () => {
    const json = JSON.stringify(READING);
    const frame = formatSse("reading", json);

    expect(frame).toBe(`event: reading\ndata: ${json}\n\n`);
    expect(frame.endsWith("\n\n")).toBe(true);
    expect(frame).not.toMatch(/\nid:/);

    const dataLine = frame.split("\n")[1];
    expect(JSON.parse(dataLine.slice("data: ".length))).toEqual(READING);
  });

  it("formats ping with empty data", () => {
    expect(formatSse("ping")).toBe("event: ping\ndata: \n\n");
  });

  it("formats reset with empty data", () => {
    expect(formatSse("reset")).toBe("event: reset\ndata: \n\n");
  });

  it("keeps two frames separable by a blank line", () => {
    const text = formatSse("ping") + formatSse("reset");
    expect(text.split("\n\n").filter(Boolean)).toEqual([
      "event: ping\ndata: ",
      "event: reset\ndata: ",
    ]);
  });
});
