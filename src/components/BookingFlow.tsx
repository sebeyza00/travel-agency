"use client";
// BOOKING segment UI — passenger capture -> confirm -> confirmation/error.
// @spec BOOKING-UI-004, BOOKING-UI-005, BOOKING-UI-006, BOOKING-UI-007, BOOKING-VAL-004

import { useState } from "react";
import type { SearchCriteria } from "@/lib/search/criteria";
import type { FlightOption } from "@/lib/flights/types";
import type { BookingInput, BookingResult, EmailStatus, Passenger, SavedBooking } from "@/lib/booking/types";
import { isCustomerEmailValid } from "@/lib/booking/validation";
import { PassengerForm } from "@/components/PassengerForm";
import { Confirmation } from "@/components/Confirmation";

export interface BookingFlowProps {
  criteria: SearchCriteria;
  option: FlightOption;
  submit: (input: BookingInput) => Promise<BookingResult>;
}

export function BookingFlow({ criteria, option, submit }: BookingFlowProps) {
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<SavedBooking | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("skipped");
  const [customerEmail, setCustomerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (booking) return <Confirmation booking={booking} emailStatus={emailStatus} />;

  const handleConfirm = async (passengers: Passenger[]) => {
    setError(null);
    // @spec BOOKING-VAL-004 — block on a malformed email; empty is allowed.
    if (!isCustomerEmailValid(customerEmail)) {
      setError("Enter a valid customer email, or leave it blank.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submit({ criteria, option, passengers, customerEmail: customerEmail.trim() || null });
      setEmailStatus(result.emailStatus);
      setBooking(result.booking);
    } catch {
      // @spec BOOKING-UI-006
      setError("The booking could not be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* @spec BOOKING-UI-007 */}
      <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4">
        <label htmlFor="customerEmail" className="text-sm font-medium text-slate-700">
          Customer email (optional)
        </label>
        <input
          id="customerEmail"
          type="email"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="customer@example.com — emailed the confirmation"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
        />
      </div>
      <PassengerForm count={criteria.passengers} submitting={submitting} onConfirm={handleConfirm} />
      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
