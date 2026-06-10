import { describe, it, expect } from "vitest";
import {
  validateSearchCriteria,
  defaultSearchInput,
  type RawSearchInput,
} from "@/lib/search/criteria";

const TODAY = "2026-06-09";

function validRaw(overrides: Partial<RawSearchInput> = {}): RawSearchInput {
  return {
    origin: "JFK",
    destination: "LAX",
    departureDate: "2026-07-01",
    returnDate: "2026-07-08",
    flexibilityDays: 0,
    passengers: 2,
    cabinClass: "economy",
    priceCeiling: null,
    corporatePolicyId: null,
    today: TODAY,
    ...overrides,
  };
}

function errorsFor(raw: RawSearchInput) {
  const result = validateSearchCriteria(raw);
  return result.ok ? [] : result.errors;
}

describe("validateSearchCriteria", () => {
  it("accepts a well-formed search and normalizes airport codes to uppercase", () => {
    // @spec SEARCH-VAL-001
    const result = validateSearchCriteria(validRaw({ origin: "jfk", destination: "lax" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.criteria.origin).toBe("JFK");
      expect(result.criteria.destination).toBe("LAX");
    }
  });

  it("rejects airport codes that are not exactly three letters", () => {
    // @spec SEARCH-VAL-001
    expect(errorsFor(validRaw({ origin: "JF" })).some((e) => e.field === "origin")).toBe(true);
    expect(errorsFor(validRaw({ destination: "LAX1" })).some((e) => e.field === "destination")).toBe(true);
    expect(errorsFor(validRaw({ origin: "J3K" })).some((e) => e.field === "origin")).toBe(true);
  });

  it("rejects when origin equals destination after normalization", () => {
    // @spec SEARCH-VAL-002
    const errors = errorsFor(validRaw({ origin: "jfk", destination: "JFK" }));
    expect(errors.some((e) => e.field === "destination")).toBe(true);
  });

  it("rejects a departure date earlier than the agent's local today", () => {
    // @spec SEARCH-VAL-003
    const errors = errorsFor(validRaw({ departureDate: "2026-06-08", today: TODAY }));
    expect(errors.some((e) => e.field === "departureDate")).toBe(true);
  });

  it("accepts a departure date equal to today", () => {
    // @spec SEARCH-VAL-003
    const result = validateSearchCriteria(
      validRaw({ departureDate: TODAY, returnDate: "2026-06-20", today: TODAY }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a return date before the departure date", () => {
    // @spec SEARCH-VAL-004
    const errors = errorsFor(validRaw({ departureDate: "2026-07-08", returnDate: "2026-07-01" }));
    expect(errors.some((e) => e.field === "returnDate")).toBe(true);
  });

  it("allows a same-day round trip (return == departure)", () => {
    // @spec SEARCH-VAL-004
    const result = validateSearchCriteria(
      validRaw({ departureDate: "2026-07-01", returnDate: "2026-07-01" }),
    );
    expect(result.ok).toBe(true);
  });

  it("allows a one-way trip (null return date)", () => {
    // @spec SEARCH-VAL-004
    const result = validateSearchCriteria(validRaw({ returnDate: null }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.criteria.returnDate).toBeNull();
  });

  it("rejects passenger counts outside 1..9 or non-integers", () => {
    // @spec SEARCH-VAL-005
    expect(errorsFor(validRaw({ passengers: 0 })).some((e) => e.field === "passengers")).toBe(true);
    expect(errorsFor(validRaw({ passengers: 10 })).some((e) => e.field === "passengers")).toBe(true);
    expect(errorsFor(validRaw({ passengers: 2.5 })).some((e) => e.field === "passengers")).toBe(true);
  });

  it("rejects a non-positive price ceiling but allows null", () => {
    // @spec SEARCH-VAL-006
    expect(errorsFor(validRaw({ priceCeiling: 0 })).some((e) => e.field === "priceCeiling")).toBe(true);
    expect(errorsFor(validRaw({ priceCeiling: -50 })).some((e) => e.field === "priceCeiling")).toBe(true);
    expect(validateSearchCriteria(validRaw({ priceCeiling: null })).ok).toBe(true);
    expect(validateSearchCriteria(validRaw({ priceCeiling: 1200 })).ok).toBe(true);
  });

  it("reports every failing field at once and does not produce criteria", () => {
    // @spec SEARCH-VAL-007
    const result = validateSearchCriteria(
      validRaw({ origin: "ZZ", passengers: 0, priceCeiling: -1 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("defaultSearchInput", () => {
  it("defaults flexibility to exact (0) and cabin to economy", () => {
    // @spec SEARCH-UI-002
    const d = defaultSearchInput();
    expect(d.flexibilityDays).toBe(0);
    expect(d.cabinClass).toBe("economy");
  });
});
