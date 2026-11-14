import { describe, expect, it } from "vitest";
import { formatAge, formatGasDelta, formatTemperature } from "@/lib/format";

const NOW = new Date(2026, 10, 12, 14, 32, 20);

describe("formatAge", () => {
  it("uses seconds, minutes and hours with a space before the unit", () => {
    expect(formatAge("2026-11-12T14:32:20", NOW)).toBe("há 0 s");
    expect(formatAge("2026-11-12T14:32:08", NOW)).toBe("há 12 s");
    expect(formatAge("2026-11-12T14:31:21", NOW)).toBe("há 59 s");
    expect(formatAge("2026-11-12T14:31:20", NOW)).toBe("há 1 min");
    expect(formatAge("2026-11-12T14:29:20", NOW)).toBe("há 3 min");
    expect(formatAge("2026-11-12T13:32:21", NOW)).toBe("há 59 min");
    expect(formatAge("2026-11-12T13:32:20", NOW)).toBe("há 1 h");
    expect(formatAge("2026-11-12T12:32:20", NOW)).toBe("há 2 h");
    expect(formatAge("2026-11-11T13:32:20", NOW)).toBe("há 25 h");
  });

  it("clamps future and invalid timestamps to há 0 s", () => {
    expect(formatAge("2026-11-12T14:32:21", NOW)).toBe("há 0 s");
    expect(formatAge("not-a-timestamp", NOW)).toBe("há 0 s");
    expect(formatAge("2026-11-12T14:32:08Z", NOW)).toBe("há 0 s");
  });
});

describe("formatGasDelta", () => {
  it("always shows an integer with a sign", () => {
    expect(formatGasDelta(300, 180)).toBe("+120");
    expect(formatGasDelta(165, 180)).toBe("-15");
    expect(formatGasDelta(180, 180)).toBe("+0");
    expect(formatGasDelta(180.4, 180)).toBe("+0");
    expect(formatGasDelta(180.6, 180)).toBe("+1");
  });
});

describe("formatTemperature", () => {
  it("shows a dash only for null, not for zero", () => {
    expect(formatTemperature(null)).toBe("—");
    expect(formatTemperature(0)).toBe("0 °C");
    expect(formatTemperature(24)).toBe("24 °C");
    expect(formatTemperature(24.5)).toBe("24.5 °C");
  });
});
