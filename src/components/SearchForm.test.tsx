import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchForm } from "@/components/SearchForm";
import type { RawSearchInput } from "@/lib/search/criteria";

const validInitial: RawSearchInput = {
  origin: "JFK",
  destination: "LAX",
  departureDate: "2030-07-01",
  returnDate: "2030-07-08",
  flexibilityDays: 0,
  passengers: 2,
  cabinClass: "economy",
  priceCeiling: null,
  corporatePolicyId: null,
};

describe("SearchForm", () => {
  it("presents all trip-search fields", () => {
    // @spec SEARCH-UI-001
    render(<SearchForm onSearch={vi.fn()} />);
    expect(screen.getByLabelText(/from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/depart/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/return/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/flexibility/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/passengers/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cabin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price ceiling/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/policy/i)).toBeInTheDocument();
  });

  it("defaults flexibility to exact and cabin to economy", () => {
    // @spec SEARCH-UI-002
    render(<SearchForm onSearch={vi.fn()} />);
    expect((screen.getByLabelText(/cabin/i) as HTMLSelectElement).value).toBe("economy");
    expect((screen.getByLabelText(/flexibility/i) as HTMLSelectElement).value).toBe("0");
  });

  it("dispatches the normalized criteria when a valid form is submitted", async () => {
    // @spec SEARCH-UI-003
    const onSearch = vi.fn();
    render(<SearchForm initial={validInitial} onSearch={onSearch} />);
    await userEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ origin: "JFK", destination: "LAX", passengers: 2 }),
    );
  });

  it("shows an inline error and does not dispatch when a field is invalid", async () => {
    // @spec SEARCH-VAL-007
    const onSearch = vi.fn();
    render(<SearchForm initial={{ ...validInitial, origin: "ZZ" }} onSearch={onSearch} />);
    await userEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(1);
  });
});
