import { describe, it, expect, vi } from "vitest";
import { confirmBooking } from "@/lib/booking/service";
import { makeBookingInput, makeOption, makeCriteria, makePassenger } from "@/test/fixtures";
import type { AuditStore } from "@/lib/audit/store";
import type { EmailSender, EmailMessage } from "@/lib/email/sender";
import type { BookingInput, SavedBooking } from "@/lib/booking/types";

function savedFrom(input: BookingInput): SavedBooking {
  const option = input.option ?? makeOption();
  return {
    id: 1,
    reference: "K4D9TZ",
    createdAt: "2026-06-09T14:32:00.000Z",
    criteria: input.criteria ?? makeCriteria(),
    option,
    passengers: input.passengers ?? [makePassenger()],
    customerEmail: input.customerEmail ?? null,
    totalPrice: option.price.total,
    currency: "USD",
    cabinClass: option.cabinClass,
    status: "confirmed",
  };
}

/** Fake store that records persistence and echoes the customer email. */
function fakeStore() {
  const createBooking = vi.fn((input: BookingInput) => savedFrom(input));
  return { createBooking } as unknown as AuditStore & { createBooking: typeof createBooking };
}

const okSender = (): EmailSender & { sent: EmailMessage[] } => {
  const sent: EmailMessage[] = [];
  return { sent, send: vi.fn(async (m: EmailMessage) => { sent.push(m); }) };
};
const failingSender = (): EmailSender => ({ send: vi.fn(async () => { throw new Error("smtp down"); }) });

describe("confirmBooking", () => {
  it("skips email and returns the booking when no customer email is given", async () => {
    // @spec BOOKING-API-006
    const store = fakeStore();
    const sender = okSender();
    const result = await confirmBooking(store, sender, makeBookingInput({ customerEmail: null }));
    expect(result.emailStatus).toBe("skipped");
    expect(sender.send).not.toHaveBeenCalled();
    expect(result.booking.reference).toBe("K4D9TZ");
    expect(store.createBooking).toHaveBeenCalledTimes(1);
  });

  it("persists, then sends, and reports 'sent' when an email is given", async () => {
    // @spec BOOKING-API-005, BOOKING-API-006
    const store = fakeStore();
    const sender = okSender();
    const result = await confirmBooking(store, sender, makeBookingInput({ customerEmail: "cust@example.com" }));
    expect(store.createBooking).toHaveBeenCalledTimes(1); // persisted first
    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(sender.sent[0].to).toBe("cust@example.com");
    expect(result.emailStatus).toBe("sent");
  });

  it("still returns the persisted booking with status 'failed' when the send errors", async () => {
    // @spec BOOKING-API-005, BOOKING-API-006
    const store = fakeStore();
    const result = await confirmBooking(store, failingSender(), makeBookingInput({ customerEmail: "cust@example.com" }));
    expect(store.createBooking).toHaveBeenCalledTimes(1); // booking persisted regardless
    expect(result.booking.reference).toBe("K4D9TZ");
    expect(result.emailStatus).toBe("failed");
  });
});
