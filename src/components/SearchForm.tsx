"use client";
// SEARCH segment UI.
// @spec SEARCH-UI-001, SEARCH-UI-002, SEARCH-UI-003, SEARCH-VAL-007

import { useState } from "react";
import {
  validateSearchCriteria,
  defaultSearchInput,
  CABIN_CLASSES,
  FLEXIBILITY_DAYS,
  type RawSearchInput,
  type SearchCriteria,
  type FieldError,
} from "@/lib/search/criteria";
import { POLICIES } from "@/lib/flights/policies";

const CABIN_LABELS: Record<string, string> = {
  economy: "Economy",
  premium_economy: "Premium economy",
  business: "Business",
  first: "First",
};
const FLEX_LABELS: Record<number, string> = { 0: "Exact dates", 1: "± 1 day", 3: "± 3 days", 7: "± 7 days" };

export interface SearchFormProps {
  initial?: RawSearchInput;
  onSearch: (criteria: SearchCriteria) => void;
}

export function SearchForm({ initial, onSearch }: SearchFormProps) {
  const [form, setForm] = useState<RawSearchInput>(initial ?? defaultSearchInput());
  const [errors, setErrors] = useState<FieldError[]>([]);

  const set = (patch: Partial<RawSearchInput>) => setForm((f) => ({ ...f, ...patch }));
  const errorFor = (field: FieldError["field"]) => errors.find((e) => e.field === field)?.message;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateSearchCriteria(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    onSearch(result.criteria);
  };

  const field = (label: string, id: string, control: React.ReactNode, field?: FieldError["field"]) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {control}
      {field && errorFor(field) && (
        <p role="alert" className="text-sm text-red-600">
          {errorFor(field)}
        </p>
      )}
    </div>
  );

  const inputClass = "rounded border border-slate-300 px-3 py-2 text-sm";

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="col-span-2 text-lg font-semibold">New flight search</h2>

      {field("From", "origin",
        <input id="origin" className={inputClass} maxLength={3} placeholder="JFK"
          value={form.origin ?? ""} onChange={(e) => set({ origin: e.target.value })} />, "origin")}
      {field("To", "destination",
        <input id="destination" className={inputClass} maxLength={3} placeholder="LAX"
          value={form.destination ?? ""} onChange={(e) => set({ destination: e.target.value })} />, "destination")}

      {field("Depart", "departureDate",
        <input id="departureDate" type="date" className={inputClass}
          value={form.departureDate ?? ""} onChange={(e) => set({ departureDate: e.target.value })} />, "departureDate")}
      {field("Return", "returnDate",
        <input id="returnDate" type="date" className={inputClass}
          value={form.returnDate ?? ""} onChange={(e) => set({ returnDate: e.target.value || null })} />, "returnDate")}

      {field("Date flexibility", "flexibilityDays",
        <select id="flexibilityDays" className={inputClass} value={String(form.flexibilityDays ?? 0)}
          onChange={(e) => set({ flexibilityDays: Number(e.target.value) })}>
          {FLEXIBILITY_DAYS.map((d) => (
            <option key={d} value={d}>{FLEX_LABELS[d]}</option>
          ))}
        </select>)}
      {field("Passengers", "passengers",
        <input id="passengers" type="number" min={1} max={9} className={inputClass}
          value={form.passengers ?? 1} onChange={(e) => set({ passengers: e.target.value })} />, "passengers")}

      {field("Cabin", "cabinClass",
        <select id="cabinClass" className={inputClass} value={form.cabinClass ?? "economy"}
          onChange={(e) => set({ cabinClass: e.target.value })}>
          {CABIN_CLASSES.map((c) => (
            <option key={c} value={c}>{CABIN_LABELS[c]}</option>
          ))}
        </select>)}
      {field("Price ceiling (USD)", "priceCeiling",
        <input id="priceCeiling" type="number" min={1} className={inputClass} placeholder="optional"
          value={form.priceCeiling ?? ""} onChange={(e) => set({ priceCeiling: e.target.value === "" ? null : e.target.value })} />, "priceCeiling")}

      {field("Corporate policy", "corporatePolicyId",
        <select id="corporatePolicyId" className={inputClass} value={form.corporatePolicyId ?? "none"}
          onChange={(e) => set({ corporatePolicyId: e.target.value === "none" ? null : e.target.value })}>
          {Object.values(POLICIES).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>)}

      <div className="col-span-2 flex justify-end">
        <button type="submit" className="rounded bg-slate-900 px-5 py-2 text-sm font-medium text-white">
          Search flights
        </button>
      </div>
    </form>
  );
}
