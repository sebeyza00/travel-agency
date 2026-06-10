"use client";
// BOOKING segment UI — passenger capture -> confirm -> confirmation/error.
// @spec BOOKING-UI-004, BOOKING-UI-005, BOOKING-UI-006

import { useState } from "react";
import type { SearchCriteria } from "@/lib/search/criteria";
import type { FlightOption } from "@/lib/flights/types";
import type { BookingInput, Passenger, SavedBooking } from "@/lib/booking/types";
import { PassengerForm } from "@/components/PassengerForm";
import { Confirmation } from "@/components/Confirmation";

export interface BookingFlowProps {
  criteria: SearchCriteria;
  option: FlightOption;
  submit: (input: BookingInput) => Promise<SavedBooking>;
}

export function BookingFlow({ criteria, option, submit }: BookingFlowProps) {
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<SavedBooking | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (booking) return <Confirmation booking={booking} />;

  const handleConfirm = async (passengers: Passenger[]) => {
    setError(null);
    setSubmitting(true);
    try {
      const saved = await submit({ criteria, option, passengers });
      setBooking(saved);
    } catch {
      // @spec BOOKING-UI-006
      setError("The booking could not be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <PassengerForm count={criteria.passengers} submitting={submitting} onConfirm={handleConfirm} />
      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
