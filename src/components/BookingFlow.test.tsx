import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingFlow } from "@/components/BookingFlow";
import { makeCriteria, makeOption, makePassenger } from "@/test/fixtures";
import type { SavedBooking } from "@/lib/booking/types";

function savedBooking(): SavedBooking {
  const option = makeOption({ passengers: 1, perPassenger: 500 });
  return {
    id: 1,
    reference: "K4D9TZ",
    createdAt: "2026-06-09T14:32:00.000Z",
    criteria: makeCriteria({ passengers: 1 }),
    option,
    passengers: [makePassenger()],
    totalPrice: option.price.total,
    currency: "USD",
    cabinClass: "economy",
    status: "confirmed",
  };
}

async function fillOnePassenger() {
  await userEvent.type(screen.getByLabelText(/first name/i), "Jane");
  await userEvent.type(screen.getByLabelText(/last name/i), "Doe");
  await userEvent.type(screen.getByLabelText(/date of birth/i), "1990-01-01");
}

const criteria = makeCriteria({ passengers: 1 });
const option = makeOption({ passengers: 1 });

describe("BookingFlow", () => {
  it("disables the confirm control once a submit is in flight", async () => {
    // @spec BOOKING-UI-004
    const submit = vi.fn(() => new Promise<SavedBooking>(() => {})); // never resolves
    render(<BookingFlow criteria={criteria} option={option} submit={submit} />);
    await fillOnePassenger();
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(submit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /confirm/i })).toBeDisabled();
  });

  it("shows a confirmation with the reference on success", async () => {
    // @spec BOOKING-UI-005
    const submit = vi.fn(() => Promise.resolve(savedBooking()));
    render(<BookingFlow criteria={criteria} option={option} submit={submit} />);
    await fillOnePassenger();
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(await screen.findByText(/K4D9TZ/)).toBeInTheDocument();
  });

  it("shows an error and no confirmation when the booking fails", async () => {
    // @spec BOOKING-UI-006
    const submit = vi.fn(() => Promise.reject(new Error("save failed")));
    render(<BookingFlow criteria={criteria} option={option} submit={submit} />);
    await fillOnePassenger();
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/booking confirmed/i)).not.toBeInTheDocument();
  });
});
