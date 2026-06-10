"use client";
// BOOKING segment UI — passenger capture.
// @spec BOOKING-UI-002, BOOKING-UI-004, BOOKING-VAL-001, BOOKING-VAL-002, BOOKING-VAL-003

import { useState } from "react";
import type { Passenger } from "@/lib/booking/types";
import {
  validatePassengers,
  type PassengerFieldError,
} from "@/lib/booking/validation";

export interface PassengerFormProps {
  count: number;
  submitting?: boolean;
  onConfirm: (passengers: Passenger[]) => void;
}

const blank = (): Passenger => ({ firstName: "", lastName: "", dateOfBirth: "" });

export function PassengerForm({ count, submitting = false, onConfirm }: PassengerFormProps) {
  const [rows, setRows] = useState<Passenger[]>(() => Array.from({ length: count }, blank));
  const [errors, setErrors] = useState<PassengerFieldError[]>([]);

  const update = (i: number, patch: Partial<Passenger>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const errorFor = (index: number, field: PassengerFieldError["field"]) =>
    errors.find((e) => e.index === index && e.field === field)?.message;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validatePassengers(rows, count, new Date());
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    onConfirm(result.passengers);
  };

  const inputClass = "rounded border border-slate-300 px-3 py-2 text-sm";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Passengers</h2>
      {rows.map((row, i) => (
        <fieldset key={i} className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
          <legend className="text-sm font-medium text-slate-500">Passenger {i + 1}</legend>
          <div className="flex flex-col gap-1">
            <label htmlFor={`fn-${i}`} className="text-sm text-slate-700">First name</label>
            <input id={`fn-${i}`} className={inputClass} value={row.firstName}
              onChange={(e) => update(i, { firstName: e.target.value })} />
            {errorFor(i, "firstName") && <p role="alert" className="text-xs text-red-600">{errorFor(i, "firstName")}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`ln-${i}`} className="text-sm text-slate-700">Last name</label>
            <input id={`ln-${i}`} className={inputClass} value={row.lastName}
              onChange={(e) => update(i, { lastName: e.target.value })} />
            {errorFor(i, "lastName") && <p role="alert" className="text-xs text-red-600">{errorFor(i, "lastName")}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`dob-${i}`} className="text-sm text-slate-700">Date of birth</label>
            <input id={`dob-${i}`} className={inputClass} placeholder="YYYY-MM-DD" value={row.dateOfBirth}
              onChange={(e) => update(i, { dateOfBirth: e.target.value })} />
            {errorFor(i, "dateOfBirth") && <p role="alert" className="text-xs text-red-600">{errorFor(i, "dateOfBirth")}</p>}
          </div>
        </fieldset>
      ))}
      <div className="flex justify-end">
        <button type="submit" disabled={submitting}
          className="rounded bg-slate-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? "Confirming…" : "Confirm booking"}
        </button>
      </div>
    </form>
  );
}
