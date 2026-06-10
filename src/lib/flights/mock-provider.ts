// FLIGHTS segment — deterministic, exhaustive mock provider.
// Traces to docs/llds/flights.md § Deterministic exhaustive generation.

import type { CabinClass, SearchCriteria } from "@/lib/search/criteria";
import type {
  FlightOption,
  FlightProvider,
  Itinerary,
  Leg,
  PriceBreakdown,
  SearchResult,
} from "@/lib/flights/types";
import { evaluateCompliance } from "@/lib/flights/policies";

const AIRLINES = [
  { name: "Delta", code: "DL" },
  { name: "United", code: "UA" },
  { name: "American", code: "AA" },
  { name: "JetBlue", code: "B6" },
  { name: "Alaska", code: "AS" },
];

const HUBS = ["ORD", "DFW", "ATL", "DEN"];

const CABIN_BASE: Record<CabinClass, number> = {
  economy: 250,
  premium_economy: 480,
  business: 1200,
  first: 2600,
};

// --- deterministic PRNG (mulberry32) seeded from the query fields ---
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00.000Z`) - Date.parse(`${b}T00:00:00.000Z`)) / 86_400_000);
}

const pad = (n: number) => `${n}`.padStart(2, "0");

function buildItinerary(
  origin: string,
  destination: string,
  dateISO: string,
  stops: number,
  airlineCode: string,
  rand: () => number,
): Itinerary {
  const legCount = stops + 1;
  const departHour = 6 + Math.floor(rand() * 14); // 06:00..19:00
  const departMinute = Math.floor(rand() * 12) * 5;
  let cursor = Date.parse(`${dateISO}T${pad(departHour)}:${pad(departMinute)}:00.000Z`);
  const start = cursor;
  const legs: Leg[] = [];
  for (let i = 0; i < legCount; i++) {
    const from = i === 0 ? origin : HUBS[(i - 1) % HUBS.length];
    const to = i === legCount - 1 ? destination : HUBS[i % HUBS.length];
    const flightMinutes = 90 + Math.floor(rand() * 180); // 1h30..4h30
    const dep = cursor;
    const arr = dep + flightMinutes * 60_000;
    legs.push({
      flightNumber: `${airlineCode}${100 + Math.floor(rand() * 899)}`,
      departAirport: from,
      departTime: new Date(dep).toISOString(),
      arriveAirport: to,
      arriveTime: new Date(arr).toISOString(),
    });
    const layover = 45 + Math.floor(rand() * 75); // 45..120 min (>= min connection)
    cursor = arr + layover * 60_000;
  }
  const end = Date.parse(legs[legs.length - 1].arriveTime);
  return { legs, durationMinutes: Math.round((end - start) / 60_000), stops };
}

function buildPrice(cabin: CabinClass, stops: number, passengers: number, rand: () => number): PriceBreakdown {
  // Fewer stops cost more; cabin sets the floor; jitter for spread.
  const stopDiscount = 1 - stops * 0.12;
  const perPassenger = Math.round(CABIN_BASE[cabin] * (0.85 + rand() * 0.7) * stopDiscount);
  const total = perPassenger * passengers;
  const baseFare = Math.round(total * 0.8);
  const taxes = Math.round(total * 0.15);
  const fees = total - baseFare - taxes;
  return { baseFare, taxes, fees, total, currency: "USD", perPassenger, passengers };
}

/**
 * Build the complete candidate set for a search. Deterministic: identical
 * query fields => identical result set. Always returns >= 1 option.
 * @spec FLIGHTS-API-001, FLIGHTS-API-002, FLIGHTS-API-003, FLIGHTS-API-004,
 *       FLIGHTS-API-005, FLIGHTS-API-006, FLIGHTS-API-007, FLIGHTS-DATA-001
 */
export function generateOptions(criteria: SearchCriteria): SearchResult {
  const { origin, destination, departureDate, returnDate, flexibilityDays, passengers, cabinClass } = criteria;
  const seed = hashString(
    [origin, destination, departureDate, returnDate ?? "ONEWAY", flexibilityDays, passengers, cabinClass].join("|"),
  );
  const rand = mulberry32(seed);
  const tripLen = returnDate ? daysBetween(returnDate, departureDate) : null;

  const options: FlightOption[] = [];
  for (let offset = -flexibilityDays; offset <= flexibilityDays; offset++) {
    const departDate = addDays(departureDate, offset);
    const returnDateForOffset = tripLen === null ? null : addDays(departDate, tripLen);
    for (const airline of AIRLINES) {
      const stops = Math.floor(rand() * 3); // 0, 1, or 2
      const outbound = buildItinerary(origin, destination, departDate, stops, airline.code, rand);
      const ret = returnDateForOffset
        ? buildItinerary(destination, origin, returnDateForOffset, stops, airline.code, rand)
        : null;
      const price = buildPrice(cabinClass, stops, passengers, rand);
      const option: FlightOption = {
        id: `${departDate}-${airline.code}-${options.length}`,
        airline,
        outbound,
        return: ret,
        cabinClass,
        price,
        compliance: { compliant: true, violations: [] },
      };
      // Evaluate against the initially-selected policy; the view lens may recompute.
      option.compliance = evaluateCompliance(option, criteria.corporatePolicyId);
      options.push(option);
    }
  }

  return { options, total: options.length };
}

export function createMockProvider(): FlightProvider {
  return {
    async search(criteria: SearchCriteria): Promise<SearchResult> {
      return generateOptions(criteria);
    },
  };
}

export const mockFlightProvider: FlightProvider = createMockProvider();
