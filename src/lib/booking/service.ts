// BOOKING segment — confirm-booking orchestration (persist, then best-effort email).
// Traces to docs/specs/booking.md BOOKING-API-005, BOOKING-API-006.

import type { AuditStore } from "@/lib/audit/store";
import type { EmailSender } from "@/lib/email/sender";
import type { BookingInput, BookingResult, EmailStatus } from "@/lib/booking/types";
import { renderConfirmationEmail } from "@/lib/email/template";

/**
 * Persist a booking, then — after it is durably stored — best-effort send the
 * confirmation email when a customer email was provided. A send failure never
 * rolls back or blocks the booking.
 * @spec BOOKING-API-005, BOOKING-API-006
 */
export async function confirmBooking(
  store: AuditStore,
  sender: EmailSender,
  input: BookingInput,
  agentEmail?: string | null,
): Promise<BookingResult> {
  // 1. Persist first — the booking is the source of truth. Attribution is
  //    server-supplied (the authenticated agent), never from the client input.
  const booking = store.createBooking(input, agentEmail);

  // 2. Best-effort email, strictly after persistence; failure never affects the booking.
  const to = (input.customerEmail ?? "").trim();
  let emailStatus: EmailStatus = "skipped";
  if (to !== "") {
    try {
      await sender.send(renderConfirmationEmail(booking, to));
      emailStatus = "sent";
    } catch {
      emailStatus = "failed";
    }
  }

  return { booking, emailStatus };
}
