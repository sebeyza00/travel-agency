import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Confirmation } from "@/components/Confirmation";
import { makeCriteria, makeOption, makePassenger } from "@/test/fixtures";
import type { SavedBooking } from "@/lib/booking/types";

function savedBooking(): SavedBooking {
  const option = makeOption({ airlineName: "Delta", passengers: 2, perPassenger: 500, stops: 0 });
  return {
    id: 1,
    reference: "K4D9TZ",
    createdAt: "2026-06-09T14:32:00.000Z",
    criteria: makeCriteria({ passengers: 2 }),
    option,
    passengers: [makePassenger({ firstName: "Jane" }), makePassenger({ firstName: "John" })],
    totalPrice: option.price.total,
    currency: "USD",
    cabinClass: "economy",
    status: "confirmed",
  };
}

describe("Confirmation", () => {
  it("shows the reference, itinerary, cabin, passengers, price, and booking time", () => {
    // @spec BOOKING-UI-005
    render(<Confirmation booking={savedBooking()} />);
    expect(screen.getByText(/K4D9TZ/)).toBeInTheDocument(); // reference
    expect(screen.getByText(/delta/i)).toBeInTheDocument(); // itinerary / airline
    expect(screen.getByText(/economy/i)).toBeInTheDocument(); // cabin
    expect(screen.getByText(/jane/i)).toBeInTheDocument(); // passenger
    expect(screen.getByText(/john/i)).toBeInTheDocument(); // passenger
    expect(screen.getByText("$1000")).toBeInTheDocument(); // total price (exact; breakdown line shows the components)
    expect(screen.getByText(/2026-06-09/)).toBeInTheDocument(); // booking timestamp
  });
});
