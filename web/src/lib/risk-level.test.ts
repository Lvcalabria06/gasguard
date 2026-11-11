import { describe, expect, it } from "vitest";
import { RISK_LEVELS, isRiskLevel } from "@/lib/risk-level";

describe("isRiskLevel", () => {
  it("lists the six risk levels in the documented order", () => {
    expect(RISK_LEVELS).toEqual(["NORMAL", "ATTENTION", "ALERT", "HIGH", "CRITICAL", "FAILURE"]);
  });

  it("accepts every risk level", () => {
    for (const level of RISK_LEVELS) expect(isRiskLevel(level)).toBe(true);
  });

  it("rejects the Portuguese CSV names and other values", () => {
    for (const value of ["CRITICO", "ATENCAO", "critical", "", null, undefined, 3]) {
      expect(isRiskLevel(value)).toBe(false);
    }
  });
});
