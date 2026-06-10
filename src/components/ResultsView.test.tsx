import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultsView } from "@/components/ResultsView";
import { makeCriteria, makeOption } from "@/test/fixtures";
import type { FlightOption, SearchResult } from "@/lib/flights/types";

const resultOf = (options: FlightOption[]): SearchResult => ({
  options,
  total: options.length,
});

describe("ResultsView", () => {
  it("displays the complete-set total as 'N of M options'", () => {
    // @spec FLIGHTS-UI-001
    const result = resultOf([
      makeOption({ id: "A", airlineName: "Delta" }),
      makeOption({ id: "B", airlineName: "United" }),
      makeOption({ id: "C", airlineName: "American" }),
    ]);
    render(<ResultsView result={result} criteria={makeCriteria({ priceCeiling: null, corporatePolicyId: null })} onBook={vi.fn()} />);
    expect(screen.getByText(/3 of 3 options/i)).toBeInTheDocument();
  });

  it("shows airline, stops, duration, and price for each option", () => {
    // @spec FLIGHTS-UI-004
    const result = resultOf([makeOption({ id: "A", airlineName: "Delta", stops: 0, perPassenger: 500, passengers: 1 })]);
    render(<ResultsView result={result} criteria={makeCriteria({ passengers: 1, priceCeiling: null })} onBook={vi.fn()} />);
    expect(screen.getByText(/delta/i)).toBeInTheDocument();
    expect(screen.getByText(/nonstop/i)).toBeInTheDocument();
    expect(screen.getByText("$500")).toBeInTheDocument(); // total (exact; per-passenger line shows "$500 / passenger")
  });

  it("renders an explicit empty state when there are no options", () => {
    // @spec FLIGHTS-UI-007
    render(<ResultsView result={resultOf([])} criteria={makeCriteria()} onBook={vi.fn()} />);
    expect(screen.getByText(/no options found/i)).toBeInTheDocument();
    expect(screen.getByText(/none were hidden/i)).toBeInTheDocument();
  });

  it("flags a non-compliant option with its violation reasons", () => {
    // @spec FLIGHTS-POL-001
    // Business cabin genuinely violates the 'standard' policy; the policy lens
    // computes the violation that the view renders.
    const option = makeOption({ id: "A", airlineName: "Delta", cabinClass: "business" });
    render(<ResultsView result={resultOf([option])} criteria={makeCriteria({ corporatePolicyId: "standard", priceCeiling: null })} onBook={vi.fn()} />);
    expect(screen.getByText(/cabin business exceeds policy maximum economy/i)).toBeInTheDocument();
  });

  it("books an option when its Book action is clicked", async () => {
    // @spec BOOKING-UI-001
    const onBook = vi.fn();
    const option = makeOption({ id: "A", airlineName: "Delta" });
    render(<ResultsView result={resultOf([option])} criteria={makeCriteria({ priceCeiling: null })} onBook={onBook} />);
    await userEvent.click(screen.getByRole("button", { name: /book/i }));
    expect(onBook).toHaveBeenCalledWith(option);
  });

  it("allows booking a non-compliant option", async () => {
    // @spec BOOKING-UI-003
    // Business cabin is non-compliant under 'standard'; Book stays enabled and
    // hands over the option (with its lens-computed, non-compliant flag).
    const onBook = vi.fn();
    const option = makeOption({ id: "A", airlineName: "Delta", cabinClass: "business" });
    render(<ResultsView result={resultOf([option])} criteria={makeCriteria({ corporatePolicyId: "standard", priceCeiling: null })} onBook={onBook} />);
    const bookBtn = screen.getByRole("button", { name: /book/i });
    expect(bookBtn).toBeEnabled();
    await userEvent.click(bookBtn);
    expect(onBook).toHaveBeenCalledWith(
      expect.objectContaining({ id: "A", compliance: expect.objectContaining({ compliant: false }) }),
    );
  });
});
