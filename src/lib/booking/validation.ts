// BOOKING segment — passenger validation.
// Traces to docs/specs/booking.md BOOKING-VAL-001..003.

import type { Passenger } from "@/lib/booking/types";

export interface PassengerFieldError {
  index: number;
  field: keyof Passenger | "count";
  message: string;
}

export type PassengerValidationResult =
  | { ok: true; passengers: Passenger[] }
  | { ok: false; errors: PassengerFieldError[] };

/**
 * Validate passenger entries against the expected count and field rules.
 * `now` is injectable so the DOB-in-the-past rule is testable.
 * @spec BOOKING-VAL-001, BOOKING-VAL-002, BOOKING-VAL-003
 */
export function validatePassengers(
  passengers: Partial<Passenger>[],
  expectedCount: number,
  now: Date,
): PassengerValidationResult {
  const errors: PassengerFieldError[] = [];

  // Exactly the expected number of passengers (BOOKING-VAL-003).
  if (passengers.length !== expectedCount) {
    errors.push({
      index: -1,
      field: "count",
      message: `Enter exactly ${expectedCount} passenger${expectedCount === 1 ? "" : "s"}.`,
    });
  }

  const todayISO = now.toISOString().slice(0, 10);

  passengers.forEach((p, index) => {
    // Required fields (BOOKING-VAL-001).
    if (!p.firstName?.trim()) errors.push({ index, field: "firstName", message: "First name is required." });
    if (!p.lastName?.trim()) errors.push({ index, field: "lastName", message: "Last name is required." });
    const dob = p.dateOfBirth?.trim();
    if (!dob) {
      errors.push({ index, field: "dateOfBirth", message: "Date of birth is required." });
    } else if (dob.slice(0, 10) >= todayISO) {
      // Strictly in the past, by calendar day (BOOKING-VAL-002).
      errors.push({ index, field: "dateOfBirth", message: "Date of birth must be in the past." });
    }
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, passengers: passengers as Passenger[] };
}
