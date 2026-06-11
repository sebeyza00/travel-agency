import { describe, it, expect } from "vitest";
import { buildAuditPayload } from "@/lib/audit/payload";
import { makeCriteria, makeOption, makePassenger } from "@/test/fixtures";
import type { SavedBooking } from "@/lib/booking/types";

function savedBooking(): SavedBooking {
  const option = makeOption({ passengers: 2, perPassenger: 500 });
  return {
    id: 1,
    reference: "ABC234",
    createdAt: "2026-06-09T12:00:00.000Z",
    criteria: makeCriteria({ passengers: 2, cabinClass: "economy", departureDate: "2026-07-01", returnDate: "2026-07-08" }),
    option,
    passengers: [makePassenger(), makePassenger({ firstName: "John" })],
    customerEmail: null,
    agentEmail: null,
    totalPrice: option.price.total,
    currency: "USD",
    cabinClass: "economy",
    status: "confirmed",
  };
}

describe("buildAuditPayload", () => {
  it("projects a booking into the fixed finance payload shape", () => {
    // @spec AUDIT-API-003
    const b = savedBooking();
    const payload = buildAuditPayload(b);
    expect(payload).toEqual({
      reference: "ABC234",
      route: { origin: "JFK", destination: "LAX" },
      dates: { departDate: "2026-07-01", returnDate: "2026-07-08" },
      cabinClass: "economy",
      passengersCount: 2,
      priceBreakdown: {
        baseFare: b.option.price.baseFare,
        taxes: b.option.price.taxes,
        fees: b.option.price.fees,
        total: b.option.price.total,
      },
      total: 1000,
      currency: "USD",
      occurredAt: "2026-06-09T12:00:00.000Z",
    });
  });
});
