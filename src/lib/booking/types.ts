// BOOKING segment — booking model.
// Traces to docs/llds/booking.md and docs/specs/booking.md.

import type { SearchCriteria, CabinClass } from "@/lib/search/criteria";
import type { FlightOption } from "@/lib/flights/types";

export interface Passenger {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date, strictly in the past at booking time
}

export type BookingStatus = "confirmed";

/** What the client sends to confirm a booking. */
export interface BookingInput {
  criteria: SearchCriteria;
  option: FlightOption; // compliance already computed under the active policy lens
  passengers: Passenger[];
  customerEmail?: string | null; // optional confirmation recipient
}

/** Outcome of the post-commit confirmation email. */
export type EmailStatus = "sent" | "failed" | "skipped";

/** The booking API result: the persisted booking plus the email outcome. */
export interface BookingResult {
  booking: SavedBooking;
  emailStatus: EmailStatus;
}

/** A persisted booking returned to the confirmation view. */
export interface SavedBooking {
  id: number;
  reference: string;
  createdAt: string; // ISO datetime
  criteria: SearchCriteria;
  option: FlightOption;
  passengers: Passenger[];
  customerEmail: string | null; // optional confirmation recipient; null when none
  totalPrice: number;
  currency: "USD";
  cabinClass: CabinClass;
  status: BookingStatus;
}
