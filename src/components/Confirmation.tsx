"use client";
// BOOKING segment UI — confirmation.
// @spec BOOKING-UI-005

import type { EmailStatus, SavedBooking } from "@/lib/booking/types";
import type { Itinerary } from "@/lib/flights/types";

export interface ConfirmationProps {
  booking: SavedBooking;
  emailStatus?: EmailStatus;
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const fmtDuration = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;
const stopsLabel = (n: number) => (n === 0 ? "Nonstop" : `${n} stop${n > 1 ? "s" : ""}`);

function Leg({ label, itin }: { label: string; itin: Itinerary }) {
  const first = itin.legs[0];
  const last = itin.legs[itin.legs.length - 1];
  return (
    <div className="text-sm text-slate-700">
      <span className="font-medium">{label}</span> {first.departAirport} {fmtTime(first.departTime)} →{" "}
      {last.arriveAirport} {fmtTime(last.arriveTime)} · {stopsLabel(itin.stops)} · {fmtDuration(itin.durationMinutes)}
    </div>
  );
}

export function Confirmation({ booking, emailStatus }: ConfirmationProps) {
  const { option, price } = { option: booking.option, price: booking.option.price };
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-emerald-900">Booking confirmed</h2>
        <span className="font-mono text-lg font-bold">Ref: {booking.reference}</span>
      </div>

      <div className="font-semibold">{option.airline.name}</div>
      <Leg label="Outbound" itin={option.outbound} />
      {option.return && <Leg label="Return" itin={option.return} />}

      <div className="text-sm text-slate-700">Cabin: {booking.cabinClass}</div>
      <div className="text-sm text-slate-700">
        Passengers: {booking.passengers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}
      </div>
      <div className="text-sm text-slate-700">
        Price: base ${price.baseFare} + taxes ${price.taxes} + fees ${price.fees} ={" "}
        <span className="font-semibold">${booking.totalPrice}</span> ({price.currency})
      </div>
      <div className="text-xs text-slate-500">Booked: {booking.createdAt.replace("T", " ").slice(0, 16)} UTC</div>

      {/* @spec BOOKING-UI-008 */}
      {emailStatus === "sent" && (
        <div className="text-sm text-emerald-800">✉ Confirmation emailed to {booking.customerEmail}</div>
      )}
      {emailStatus === "failed" && (
        <div className="text-sm text-amber-700">
          Couldn’t email the confirmation — the booking is still confirmed; hand over or print this page.
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={() => window.print()}
          className="rounded border border-emerald-600 px-4 py-1.5 text-sm font-medium text-emerald-800">
          Print / hand to customer
        </button>
      </div>
    </div>
  );
}
