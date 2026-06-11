import { describe, it, expect } from "vitest";
import { renderConfirmationEmail } from "@/lib/email/template";
import { makeCriteria, makeOption, makePassenger } from "@/test/fixtures";
import type { SavedBooking } from "@/lib/booking/types";

function booking(roundTrip: boolean): SavedBooking {
  const option = makeOption({ airlineName: "Delta", passengers: 2, perPassenger: 500, stops: 0, roundTrip });
  return {
    id: 1,
    reference: "K4D9TZ",
    createdAt: "2026-06-09T14:32:00.000Z",
    criteria: makeCriteria({ passengers: 2, returnDate: roundTrip ? "2026-07-08" : null }),
    option,
    passengers: [makePassenger({ firstName: "Jane" }), makePassenger({ firstName: "John" })],
    customerEmail: "cust@example.com",
    agentEmail: "agent@example.com",
    totalPrice: option.price.total,
    currency: "USD",
    cabinClass: "economy",
    status: "confirmed",
  };
}

describe("renderConfirmationEmail", () => {
  it("addresses the email and includes the reference, itinerary, passengers, price, and timestamp", () => {
    // @spec EMAIL-DATA-001
    const msg = renderConfirmationEmail(booking(true), "cust@example.com");
    expect(msg.to).toBe("cust@example.com");
    expect(msg.subject).toContain("K4D9TZ");
    expect(msg.body).toContain("K4D9TZ"); // reference
    expect(msg.body).toContain("Delta"); // airline
    expect(msg.body).toMatch(/economy/i); // cabin
    expect(msg.body).toContain("Jane"); // passenger
    expect(msg.body).toContain("John");
    expect(msg.body).toContain("1000"); // total
    expect(msg.body).toContain("2026-06-09"); // timestamp
  });

  it("includes a return line for round trips but not for one-way", () => {
    // @spec EMAIL-DATA-001
    expect(renderConfirmationEmail(booking(true), "cust@example.com").body).toMatch(/return/i);
    expect(renderConfirmationEmail(booking(false), "cust@example.com").body).not.toMatch(/return/i);
  });
});
