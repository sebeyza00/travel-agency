// FLIGHTS segment — view lenses (policy + ceiling) and sort/filter.
// Traces to docs/llds/flights.md § View lenses and § Sort & filter.

import type { FlightOption } from "@/lib/flights/types";
import { evaluateCompliance } from "@/lib/flights/policies";

const totalDuration = (o: FlightOption) =>
  o.outbound.durationMinutes + (o.return?.durationMinutes ?? 0);

const departTime = (o: FlightOption) => Date.parse(o.outbound.legs[0].departTime);

export type SortKey = "price" | "duration" | "departure" | "stops";

export interface FilterState {
  maxStops: number | null; // null = any
  airlines: string[]; // empty = all
  departWindow: { startHour: number; endHour: number } | null;
  priceRange: { min: number; max: number } | null;
}

export interface ViewState {
  sort: SortKey;
  filters: FilterState;
  priceCeiling: number | null; // ceiling lens
  policyId: string | null; // policy lens
}

export interface ResultsView {
  total: number; // M — invariant for a given result set
  visible: FlightOption[]; // N — the subset after lenses/filters
  hiddenByCeiling: number; // how many of M exceed the ceiling
  withinBudget: number; // how many of M are at/under the ceiling
}

export function emptyFilters(): FilterState {
  return { maxStops: null, airlines: [], departWindow: null, priceRange: null };
}

export function defaultView(criteria: {
  priceCeiling: number | null;
  corporatePolicyId: string | null;
}): ViewState {
  return {
    sort: "price",
    filters: emptyFilters(),
    priceCeiling: criteria.priceCeiling,
    policyId: criteria.corporatePolicyId,
  };
}

/**
 * Recompute each option's compliance under the active policy lens.
 * @spec FLIGHTS-POL-002, FLIGHTS-POL-004, FLIGHTS-POL-005
 */
export function applyPolicyLens(
  options: FlightOption[],
  policyId: string | null,
): FlightOption[] {
  return options.map((o) => ({ ...o, compliance: evaluateCompliance(o, policyId) }));
}

/** @spec FLIGHTS-UI-005 */
export function sortOptions(options: FlightOption[], sort: SortKey): FlightOption[] {
  const copy = [...options];
  const cmp: Record<SortKey, (a: FlightOption, b: FlightOption) => number> = {
    price: (a, b) => a.price.total - b.price.total,
    duration: (a, b) => totalDuration(a) - totalDuration(b),
    departure: (a, b) => departTime(a) - departTime(b),
    stops: (a, b) => a.outbound.stops - b.outbound.stops,
  };
  return copy.sort(cmp[sort]);
}

/** @spec FLIGHTS-UI-006 */
export function filterOptions(options: FlightOption[], filters: FilterState): FlightOption[] {
  return options.filter((o) => {
    if (filters.maxStops != null && o.outbound.stops > filters.maxStops) return false;
    if (filters.airlines.length > 0 && !filters.airlines.includes(o.airline.code)) return false;
    if (filters.priceRange && (o.price.total < filters.priceRange.min || o.price.total > filters.priceRange.max)) {
      return false;
    }
    if (filters.departWindow) {
      const hour = new Date(o.outbound.legs[0].departTime).getUTCHours();
      if (hour < filters.departWindow.startHour || hour > filters.departWindow.endHour) return false;
    }
    return true;
  });
}

/**
 * Derive the visible subset from the complete set + view state. The total M
 * never changes; only the visible subset N and the ceiling counts do.
 * @spec FLIGHTS-UI-001, FLIGHTS-UI-002, FLIGHTS-UI-003, FLIGHTS-UI-008,
 *       FLIGHTS-UI-009, FLIGHTS-UI-010
 */
export function deriveResultsView(allOptions: FlightOption[], view: ViewState): ResultsView {
  const total = allOptions.length; // M — invariant
  const flagged = applyPolicyLens(allOptions, view.policyId);

  const overCeiling = (o: FlightOption) =>
    view.priceCeiling != null && o.price.total > view.priceCeiling;
  const hiddenByCeiling = flagged.filter(overCeiling).length;

  const withinCeiling = flagged.filter((o) => !overCeiling(o));
  const filtered = filterOptions(withinCeiling, view.filters);
  const visible = sortOptions(filtered, view.sort);

  return { total, visible, hiddenByCeiling, withinBudget: total - hiddenByCeiling };
}
