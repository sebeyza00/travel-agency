// AUDIT segment — finance reconciliation payload.
// Traces to docs/llds/audit.md § Persistence API and docs/specs/audit.md.

import type { SavedBooking } from "@/lib/booking/types";

/** The fixed, finance-facing subset stored in audit_log.payload_json. */
export interface AuditPayload {
  reference: string;
  route: { origin: string; destination: string };
  dates: { departDate: string; returnDate: string | null };
  cabinClass: string;
  passengersCount: number;
  priceBreakdown: {
    baseFare: number;
    taxes: number;
    fees: number;
    total: number;
  };
  total: number;
  currency: "USD";
  occurredAt: string; // ISO-8601
}

/** Derive the finance payload from a saved booking. @spec AUDIT-API-003 */
export function buildAuditPayload(booking: SavedBooking): AuditPayload {
  const { baseFare, taxes, fees, total } = booking.option.price;
  return {
    reference: booking.reference,
    route: { origin: booking.criteria.origin, destination: booking.criteria.destination },
    dates: { departDate: booking.criteria.departureDate, returnDate: booking.criteria.returnDate },
    cabinClass: booking.cabinClass,
    passengersCount: booking.passengers.length,
    priceBreakdown: { baseFare, taxes, fees, total },
    total: booking.totalPrice,
    currency: "USD",
    occurredAt: booking.createdAt,
  };
}
