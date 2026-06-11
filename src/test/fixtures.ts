// Shared test fixtures (not production code; not a *.test file).

import type { CabinClass, SearchCriteria } from "@/lib/search/criteria";
import type { FlightOption, Itinerary, PriceBreakdown } from "@/lib/flights/types";
import type { BookingInput, Passenger } from "@/lib/booking/types";

const iso = (ms: number) => new Date(ms).toISOString();

export function makeItinerary(
  departIso: string,
  durationMinutes: number,
  stops: number,
  co2Kg = 200 + stops * 50,
): Itinerary {
  const legCount = stops + 1;
  const legs = [];
  let cursor = Date.parse(departIso);
  for (let i = 0; i < legCount; i++) {
    const dep = cursor;
    const arr = dep + 120 * 60_000; // 2h flight leg
    legs.push({
      flightNumber: `XX${100 + i}`,
      departAirport: i === 0 ? "JFK" : "ORD",
      departTime: iso(dep),
      arriveAirport: i === legCount - 1 ? "LAX" : "ORD",
      arriveTime: iso(arr),
    });
    cursor = arr + 60 * 60_000; // 60 min layover
  }
  return { legs, durationMinutes, stops, co2Kg };
}

export interface MakeOptionOverrides {
  id?: string;
  airlineCode?: string;
  airlineName?: string;
  cabinClass?: CabinClass;
  stops?: number;
  perPassenger?: number;
  passengers?: number;
  departIso?: string;
  durationMinutes?: number;
  roundTrip?: boolean;
  co2Kg?: number; // per-itinerary emissions; applied to outbound and (if any) return
}

export function makeOption(o: MakeOptionOverrides = {}): FlightOption {
  const passengers = o.passengers ?? 1;
  const perPassenger = o.perPassenger ?? 500;
  const total = perPassenger * passengers;
  const price: PriceBreakdown = {
    baseFare: total,
    taxes: 0,
    fees: 0,
    total,
    currency: "USD",
    perPassenger,
    passengers,
  };
  const departIso = o.departIso ?? "2026-07-01T08:00:00.000Z";
  const co2 = o.co2Kg ?? 200 + (o.stops ?? 0) * 50;
  return {
    id: o.id ?? "opt-1",
    airline: { name: o.airlineName ?? "Delta", code: o.airlineCode ?? "DL" },
    outbound: makeItinerary(departIso, o.durationMinutes ?? 330, o.stops ?? 0, co2),
    return: o.roundTrip ? makeItinerary("2026-07-08T18:00:00.000Z", 330, o.stops ?? 0, co2) : null,
    cabinClass: o.cabinClass ?? "economy",
    price,
    compliance: { compliant: true, violations: [] },
  };
}

export function makeCriteria(overrides: Partial<SearchCriteria> = {}): SearchCriteria {
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

export function makePassenger(overrides: Partial<Passenger> = {}): Passenger {
  return { firstName: "Jane", lastName: "Doe", dateOfBirth: "1990-05-01", ...overrides };
}

export function makeBookingInput(overrides: Partial<BookingInput> = {}): BookingInput {
  const passengers = overrides.passengers ?? [makePassenger(), makePassenger({ firstName: "John" })];
  const criteria = overrides.criteria ?? makeCriteria({ passengers: passengers.length });
  const option = overrides.option ?? makeOption({ passengers: passengers.length, perPassenger: 500 });
  return { criteria, option, passengers, customerEmail: overrides.customerEmail ?? null };
}
