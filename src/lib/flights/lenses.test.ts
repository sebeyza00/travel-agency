import { describe, it, expect } from "vitest";
import {
  applyPolicyLens,
  sortOptions,
  filterOptions,
  deriveResultsView,
  emptyFilters,
  type FilterState,
  type ViewState,
} from "@/lib/flights/lenses";
import { makeOption } from "@/test/fixtures";
import type { FlightOption } from "@/lib/flights/types";

// A: $300, 600m, depart 12:00, 1 stop, economy, DL
// B: $900, 300m, depart 06:00, 0 stop, business, AA
// C: $500, 400m, depart 09:00, 2 stop, economy, UA
const A = makeOption({ id: "A", airlineCode: "DL", cabinClass: "economy", stops: 1, perPassenger: 300, durationMinutes: 600, departIso: "2026-07-01T12:00:00.000Z" });
const B = makeOption({ id: "B", airlineCode: "AA", cabinClass: "business", stops: 0, perPassenger: 900, durationMinutes: 300, departIso: "2026-07-01T06:00:00.000Z" });
const C = makeOption({ id: "C", airlineCode: "UA", cabinClass: "economy", stops: 2, perPassenger: 500, durationMinutes: 400, departIso: "2026-07-01T09:00:00.000Z" });
const ALL: FlightOption[] = [A, B, C];

const ids = (opts: FlightOption[]) => opts.map((o) => o.id);
const view = (overrides: Partial<ViewState> = {}): ViewState => ({
  sort: "price",
  filters: emptyFilters(),
  priceCeiling: null,
  policyId: null,
  ...overrides,
});
const filters = (overrides: Partial<FilterState> = {}): FilterState => ({
  ...emptyFilters(),
  ...overrides,
});

describe("sortOptions", () => {
  it("sorts by total price, duration, departure, and stops", () => {
    // @spec FLIGHTS-UI-005
    expect(ids(sortOptions(ALL, "price"))).toEqual(["A", "C", "B"]);
    expect(ids(sortOptions(ALL, "duration"))).toEqual(["B", "C", "A"]);
    expect(ids(sortOptions(ALL, "departure"))).toEqual(["B", "C", "A"]);
    expect(ids(sortOptions(ALL, "stops"))).toEqual(["B", "A", "C"]);
  });
});

describe("filterOptions", () => {
  it("filters by stops, airline, price range, and departure window", () => {
    // @spec FLIGHTS-UI-006
    expect(ids(filterOptions(ALL, filters({ maxStops: 0 })))).toEqual(["B"]);
    expect(ids(filterOptions(ALL, filters({ airlines: ["UA"] })))).toEqual(["C"]);
    expect(new Set(ids(filterOptions(ALL, filters({ priceRange: { min: 400, max: 1000 } }))))).toEqual(new Set(["B", "C"]));
    expect(new Set(ids(filterOptions(ALL, filters({ departWindow: { startHour: 8, endHour: 13 } }))))).toEqual(new Set(["A", "C"]));
  });
});

describe("applyPolicyLens", () => {
  it("recomputes compliance over the whole set without dropping any option", () => {
    // @spec FLIGHTS-POL-002, FLIGHTS-POL-005
    const flagged = applyPolicyLens(ALL, "standard");
    expect(flagged.length).toBe(3); // nothing removed
    const byId = Object.fromEntries(flagged.map((o) => [o.id, o]));
    expect(byId.A.compliance.compliant).toBe(true);
    expect(byId.B.compliance.compliant).toBe(false); // business + $900
    expect(byId.C.compliance.compliant).toBe(false); // 2 stops
  });

  it("changing the policy lens re-flags without changing the set size", () => {
    // @spec FLIGHTS-POL-005
    expect(applyPolicyLens(ALL, "none").every((o) => o.compliance.compliant)).toBe(true);
    expect(applyPolicyLens(ALL, "executive").length).toBe(3);
  });
});

describe("deriveResultsView", () => {
  it("reports M = the complete-set size and never changes it under sort/filter", () => {
    // @spec FLIGHTS-UI-001, FLIGHTS-UI-002
    expect(deriveResultsView(ALL, view()).total).toBe(3);
    expect(deriveResultsView(ALL, view({ filters: filters({ maxStops: 0 }) })).total).toBe(3);
    expect(deriveResultsView(ALL, view({ sort: "duration" })).total).toBe(3);
  });

  it("clearing filters returns the visible set to all M options", () => {
    // @spec FLIGHTS-UI-003
    const filtered = deriveResultsView(ALL, view({ filters: filters({ maxStops: 0 }) }));
    expect(filtered.visible.length).toBe(1);
    const cleared = deriveResultsView(ALL, view({ filters: emptyFilters() }));
    expect(cleared.visible.length).toBe(3);
  });

  it("hides options above the price ceiling but keeps them counted in M", () => {
    // @spec FLIGHTS-UI-008
    const r = deriveResultsView(ALL, view({ priceCeiling: 600 }));
    expect(r.total).toBe(3);
    expect(ids(r.visible)).not.toContain("B"); // $900 hidden
    expect(r.hiddenByCeiling).toBe(1);
    expect(r.withinBudget).toBe(2);
  });

  it("adjusting or clearing the ceiling recomputes visibility with M unchanged", () => {
    // @spec FLIGHTS-UI-009, FLIGHTS-UI-010
    const tight = deriveResultsView(ALL, view({ priceCeiling: 400 }));
    expect(tight.hiddenByCeiling).toBe(2); // only A ($300) within budget
    const cleared = deriveResultsView(ALL, view({ priceCeiling: null }));
    expect(cleared.hiddenByCeiling).toBe(0);
    expect(cleared.visible.length).toBe(3);
    expect(tight.total).toBe(cleared.total); // M invariant across lens changes
  });

  it("keeps non-compliant options visible (policy flags, never filters)", () => {
    // @spec FLIGHTS-POL-002
    const r = deriveResultsView(ALL, view({ policyId: "standard" }));
    expect(r.total).toBe(3);
    expect(ids(r.visible)).toContain("B"); // non-compliant but still shown
  });

  it("composes ceiling-hiding and policy-flagging independently", () => {
    // @spec FLIGHTS-POL-004
    // B is BOTH over the $600 ceiling AND non-compliant with 'standard'.
    const r = deriveResultsView(ALL, view({ priceCeiling: 600, policyId: "standard" }));
    expect(r.hiddenByCeiling).toBe(1); // B hidden by ceiling
    const fullyFlagged = applyPolicyLens(ALL, "standard");
    const b = fullyFlagged.find((o) => o.id === "B")!;
    expect(b.compliance.compliant).toBe(false); // ...and still carries its violations
  });
});
