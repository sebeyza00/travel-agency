import { describe, it, expect } from "vitest";
import { generateOptions } from "@/lib/flights/mock-provider";
import type { SearchCriteria } from "@/lib/search/criteria";
import type { FlightOption, Itinerary } from "@/lib/flights/types";

function criteria(overrides: Partial<SearchCriteria> = {}): SearchCriteria {
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
    ...overrides,
  };
}

const dateOf = (iso: string) => iso.slice(0, 10);
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

describe("generateOptions — completeness contract", () => {
  it("returns total equal to the number of options (the complete set)", () => {
    // @spec FLIGHTS-API-001
    const result = generateOptions(criteria());
    expect(result.total).toBe(result.options.length);
  });

  it("returns at least one option for any well-formed route/date", () => {
    // @spec FLIGHTS-API-002
    expect(generateOptions(criteria()).options.length).toBeGreaterThanOrEqual(1);
    expect(generateOptions(criteria({ origin: "BOS", destination: "SEA" })).options.length).toBeGreaterThanOrEqual(1);
  });

  it("is deterministic: identical criteria yield an identical result set", () => {
    // @spec FLIGHTS-API-003
    expect(generateOptions(criteria())).toEqual(generateOptions(criteria()));
  });
});

describe("generateOptions — itinerary validity", () => {
  it("emits only temporally valid itineraries", () => {
    // @spec FLIGHTS-API-004
    const { options } = generateOptions(criteria({ flexibilityDays: 3 }));
    const checkItin = (it: Itinerary) => {
      expect(it.legs.length).toBeGreaterThanOrEqual(1);
      expect(it.stops).toBe(it.legs.length - 1);
      for (const leg of it.legs) {
        expect(Date.parse(leg.arriveTime)).toBeGreaterThan(Date.parse(leg.departTime));
      }
      for (let i = 1; i < it.legs.length; i++) {
        const layover = Date.parse(it.legs[i].departTime) - Date.parse(it.legs[i - 1].arriveTime);
        expect(layover).toBeGreaterThanOrEqual(30 * 60_000); // >= 30 min connection
      }
    };
    for (const o of options) {
      checkItin(o.outbound);
      if (o.return) checkItin(o.return);
    }
  });
});

describe("generateOptions — option shape", () => {
  it("includes airline, outbound, requested cabin, and a price breakdown", () => {
    // @spec FLIGHTS-API-005
    const { options } = generateOptions(criteria({ cabinClass: "business" }));
    for (const o of options) {
      expect(o.airline.name).toBeTruthy();
      expect(o.airline.code).toBeTruthy();
      expect(o.outbound.legs.length).toBeGreaterThanOrEqual(1);
      expect(o.cabinClass).toBe("business");
      expect(o.price).toBeTruthy();
    }
  });

  it("includes a return itinerary if and only if the search is round-trip", () => {
    // @spec FLIGHTS-API-005
    for (const o of generateOptions(criteria({ returnDate: "2026-07-08" })).options) {
      expect(o.return).not.toBeNull();
    }
    for (const o of generateOptions(criteria({ returnDate: null })).options) {
      expect(o.return).toBeNull();
    }
  });
});

describe("generateOptions — price breakdown", () => {
  it("totals are consistent and per-passenger and currency are correct", () => {
    // @spec FLIGHTS-DATA-001
    const { options } = generateOptions(criteria({ passengers: 2 }));
    for (const o of options) {
      const p = o.price;
      expect(p.total).toBeCloseTo(p.baseFare + p.taxes + p.fees, 2);
      expect(p.perPassenger).toBeCloseTo(p.total / 2, 2);
      expect(p.passengers).toBe(2);
      expect(p.currency).toBe("USD");
    }
  });
});

describe("generateOptions — date flexibility", () => {
  it("spans a symmetric +/- N day departure window", () => {
    // @spec FLIGHTS-API-006
    const { options } = generateOptions(criteria({ flexibilityDays: 3, returnDate: null }));
    const departDates = new Set(options.map((o) => dateOf(o.outbound.legs[0].departTime)));
    const sorted = [...departDates].sort();
    expect(sorted[0]).toBe("2026-06-28"); // -3 days
    expect(sorted[sorted.length - 1]).toBe("2026-07-04"); // +3 days
    expect(departDates.size).toBe(7); // full symmetric window
  });

  it("exact search (flex 0) produces a single departure date", () => {
    // @spec FLIGHTS-API-006
    const { options } = generateOptions(criteria({ flexibilityDays: 0, returnDate: null }));
    const departDates = new Set(options.map((o) => dateOf(o.outbound.legs[0].departTime)));
    expect([...departDates]).toEqual(["2026-07-01"]);
  });

  it("preserves trip length across the flex window for round trips", () => {
    // @spec FLIGHTS-API-007
    const tripLen = daysBetween("2026-07-08", "2026-07-01"); // 7
    const { options } = generateOptions(
      criteria({ departureDate: "2026-07-01", returnDate: "2026-07-08", flexibilityDays: 3 }),
    );
    for (const o of options as FlightOption[]) {
      const dep = dateOf(o.outbound.legs[0].departTime);
      const ret = dateOf(o.return!.legs[0].departTime);
      expect(daysBetween(ret, dep)).toBe(tripLen);
    }
  });
});
