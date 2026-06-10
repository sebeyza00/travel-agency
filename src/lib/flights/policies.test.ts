import { describe, it, expect } from "vitest";
import { evaluateCompliance } from "@/lib/flights/policies";
import { makeOption } from "@/test/fixtures";

describe("evaluateCompliance", () => {
  it("flags an option that violates the policy, listing every reason", () => {
    // @spec FLIGHTS-POL-001
    // Standard policy: economy, <=1 stop, <=$800pp. This option breaks cabin, stops, and price.
    const option = makeOption({ cabinClass: "business", stops: 2, perPassenger: 1200 });
    const result = evaluateCompliance(option, "standard");
    expect(result.compliant).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
  });

  it("marks a fully conforming option compliant with no violations", () => {
    // @spec FLIGHTS-POL-001
    const option = makeOption({ cabinClass: "economy", stops: 0, perPassenger: 600 });
    const result = evaluateCompliance(option, "standard");
    expect(result.compliant).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("treats every option as compliant when no policy is selected", () => {
    // @spec FLIGHTS-POL-003
    const option = makeOption({ cabinClass: "first", stops: 3, perPassenger: 9999 });
    expect(evaluateCompliance(option, "none")).toEqual({ compliant: true, violations: [] });
    expect(evaluateCompliance(option, null)).toEqual({ compliant: true, violations: [] });
  });
});
