import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PassengerForm } from "@/components/PassengerForm";

describe("PassengerForm", () => {
  it("renders exactly one passenger row per passenger in the search", () => {
    // @spec BOOKING-UI-002
    render(<PassengerForm count={3} onConfirm={vi.fn()} />);
    expect(screen.getAllByLabelText(/first name/i)).toHaveLength(3);
    expect(screen.getAllByLabelText(/last name/i)).toHaveLength(3);
    expect(screen.getAllByLabelText(/date of birth/i)).toHaveLength(3);
  });

  it("disables the confirm control while a submit is in flight", () => {
    // @spec BOOKING-UI-004
    render(<PassengerForm count={1} submitting onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: /confirm/i })).toBeDisabled();
  });
});
