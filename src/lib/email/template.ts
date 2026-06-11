// EMAIL segment — confirmation email template.
// Traces to docs/specs/email.md EMAIL-DATA-001.

import type { SavedBooking } from "@/lib/booking/types";
import type { Itinerary } from "@/lib/flights/types";
import type { EmailMessage } from "@/lib/email/sender";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const fmtDuration = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;
const stopsLabel = (n: number) => (n === 0 ? "Nonstop" : `${n} stop${n > 1 ? "s" : ""}`);

function itineraryLine(label: string, itin: Itinerary): string {
  const first = itin.legs[0];
  const last = itin.legs[itin.legs.length - 1];
  return `${label}: ${first.departAirport} ${fmtTime(first.departTime)} -> ${last.arriveAirport} ${fmtTime(last.arriveTime)} (${stopsLabel(itin.stops)}, ${fmtDuration(itin.durationMinutes)})`;
}

/**
 * Render a plain-text confirmation email for a booking.
 * @spec EMAIL-DATA-001
 */
export function renderConfirmationEmail(booking: SavedBooking, to: string): EmailMessage {
  const { option, price } = { option: booking.option, price: booking.option.price };
  const lines = [
    `Your flight booking is confirmed.`,
    ``,
    `Booking reference: ${booking.reference}`,
    `Airline: ${option.airline.name}`,
    itineraryLine("Outbound", option.outbound),
  ];
  if (option.return) lines.push(itineraryLine("Return", option.return));
  lines.push(
    `Cabin: ${booking.cabinClass}`,
    `Passengers: ${booking.passengers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}`,
    `Price: base $${price.baseFare} + taxes $${price.taxes} + fees $${price.fees} = $${booking.totalPrice} ${booking.currency}`,
    `Booked: ${booking.createdAt.replace("T", " ").slice(0, 16)} UTC`,
    ``,
    `Thank you for booking with us.`,
  );

  return {
    to,
    subject: `Your flight booking is confirmed — ${booking.reference}`,
    body: lines.join("\n"),
  };
}
