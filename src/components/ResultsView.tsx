"use client";
// FLIGHTS segment UI — results comparison with view lenses.
// @spec FLIGHTS-UI-001, FLIGHTS-UI-003, FLIGHTS-UI-004, FLIGHTS-UI-005,
//       FLIGHTS-UI-006, FLIGHTS-UI-007, FLIGHTS-UI-008, FLIGHTS-UI-009,
//       FLIGHTS-POL-001, BOOKING-UI-001, BOOKING-UI-003

import { useMemo, useState } from "react";
import type { SearchCriteria } from "@/lib/search/criteria";
import type { FlightOption, Itinerary, SearchResult } from "@/lib/flights/types";
import {
  deriveResultsView,
  emptyFilters,
  defaultView,
  type SortKey,
  type ViewState,
} from "@/lib/flights/lenses";
import { POLICIES } from "@/lib/flights/policies";

export interface ResultsViewProps {
  result: SearchResult;
  criteria: SearchCriteria;
  onBook: (option: FlightOption) => void;
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const fmtDuration = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;
const stopsLabel = (n: number) => (n === 0 ? "Nonstop" : `${n} stop${n > 1 ? "s" : ""}`);

function ItineraryLine({ label, itin }: { label: string; itin: Itinerary }) {
  const first = itin.legs[0];
  const last = itin.legs[itin.legs.length - 1];
  return (
    <div className="text-sm text-slate-700">
      <span className="font-medium">{label}</span> {first.departAirport} {fmtTime(first.departTime)} →{" "}
      {last.arriveAirport} {fmtTime(last.arriveTime)} · {stopsLabel(itin.stops)} · {fmtDuration(itin.durationMinutes)}
    </div>
  );
}

export function ResultsView({ result, criteria, onBook }: ResultsViewProps) {
  const [view, setView] = useState<ViewState>(defaultView(criteria));
  const derived = useMemo(() => deriveResultsView(result.options, view), [result.options, view]);

  const filtersActive =
    view.filters.maxStops !== null ||
    view.filters.airlines.length > 0 ||
    view.filters.priceRange !== null ||
    view.filters.departWindow !== null ||
    view.priceCeiling !== null;

  if (result.total === 0) {
    // @spec FLIGHTS-UI-007
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
        No options found — none were hidden. This route returned an empty set.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          {/* @spec FLIGHTS-UI-001 */}
          {derived.visible.length} of {result.total} options
          {view.priceCeiling !== null && (
            <span className="ml-2 text-slate-500">({derived.withinBudget} within budget)</span>
          )}
        </p>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1">
            Sort
            <select
              className="rounded border border-slate-300 px-2 py-1"
              value={view.sort}
              onChange={(e) => setView({ ...view, sort: e.target.value as SortKey })}
            >
              <option value="price">Price</option>
              <option value="duration">Duration</option>
              <option value="departure">Departure</option>
              <option value="stops">Stops</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            Policy
            <select
              className="rounded border border-slate-300 px-2 py-1"
              value={view.policyId ?? "none"}
              onChange={(e) => setView({ ...view, policyId: e.target.value === "none" ? null : e.target.value })}
            >
              {Object.values(POLICIES).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          {filtersActive && (
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1"
              onClick={() => setView({ ...view, filters: emptyFilters(), priceCeiling: null })}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {derived.hiddenByCeiling > 0 && (
        <p className="text-sm text-amber-700">
          {derived.hiddenByCeiling} option{derived.hiddenByCeiling > 1 ? "s" : ""} over the price ceiling hidden —
          use “Clear filters” to see all {result.total}.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {derived.visible.map((o) => (
          <li key={o.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="font-semibold">{o.airline.name}</div>
                <ItineraryLine label="Outbound" itin={o.outbound} />
                {o.return && <ItineraryLine label="Return" itin={o.return} />}
                {!o.compliance.compliant && (
                  <ul className="mt-1 text-sm text-red-600">
                    <li className="font-medium">Policy non-compliant</li>
                    {o.compliance.violations.map((v) => (
                      <li key={v}>• {v}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-lg font-semibold">${o.price.total}</div>
                <div className="text-xs text-slate-500">${o.price.perPassenger} / passenger</div>
                <button
                  type="button"
                  className="rounded bg-slate-900 px-4 py-1.5 text-sm font-medium text-white"
                  onClick={() => onBook(o)}
                >
                  Book
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
