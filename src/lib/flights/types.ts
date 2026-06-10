// FLIGHTS segment — option/provider model.
// Traces to docs/llds/flights.md and docs/specs/flights.md.

import type { CabinClass, SearchCriteria } from "@/lib/search/criteria";

export interface Leg {
  flightNumber: string;
  departAirport: string;
  departTime: string; // ISO datetime
  arriveAirport: string;
  arriveTime: string; // ISO datetime
}

export interface Itinerary {
  legs: Leg[]; // non-empty; 1 leg = nonstop
  durationMinutes: number; // total incl. layovers
  stops: number; // legs.length - 1
  co2Kg: number; // estimated CO2 emissions for this itinerary, kg
}

export interface PriceBreakdown {
  baseFare: number;
  taxes: number;
  fees: number;
  total: number; // baseFare + taxes + fees (all passengers)
  currency: "USD";
  perPassenger: number; // total / passengers
  passengers: number;
}

export interface ComplianceResult {
  compliant: boolean;
  violations: string[]; // human-readable reasons; empty when compliant
}

export interface FlightOption {
  id: string;
  airline: { name: string; code: string };
  outbound: Itinerary;
  return: Itinerary | null; // present iff round-trip
  cabinClass: CabinClass;
  price: PriceBreakdown;
  compliance: ComplianceResult;
}

export interface SearchResult {
  options: FlightOption[];
  total: number; // invariant: total === options.length
}

/** The swappable provider boundary. The MVP ships only MockFlightProvider. */
export interface FlightProvider {
  search(criteria: SearchCriteria): Promise<SearchResult>;
}
