import { describe, it, expect } from "vitest";
import { validatePassengers, isCustomerEmailValid } from "@/lib/booking/validation";
import { makePassenger } from "@/test/fixtures";

describe("isCustomerEmailValid", () => {
  it("allows an empty/whitespace/absent email but rejects a malformed one", () => {
    // @spec BOOKING-VAL-004
    expect(isCustomerEmailValid("")).toBe(true);
    expect(isCustomerEmailValid("   ")).toBe(true);
    expect(isCustomerEmailValid(null)).toBe(true);
    expect(isCustomerEmailValid(undefined)).toBe(true);
    expect(isCustomerEmailValid("jane@example.com")).toBe(true);
    expect(isCustomerEmailValid("not-an-email")).toBe(false);
    expect(isCustomerEmailValid("jane@nodot")).toBe(false);
    expect(isCustomerEmailValid("jane @example.com")).toBe(false);
  });
});

const NOW = new Date("2026-06-09T12:00:00.000Z");

describe("validatePassengers", () => {
  it("accepts exactly the expected number of complete passengers", () => {
    // @spec BOOKING-VAL-001, BOOKING-VAL-003
    const result = validatePassengers([makePassenger(), makePassenger({ firstName: "John" })], 2, NOW);
    expect(result.ok).toBe(true);
  });

  it("requires first name, last name, and date of birth on every passenger", () => {
    // @spec BOOKING-VAL-001
    const result = validatePassengers([makePassenger({ firstName: "" }), makePassenger({ dateOfBirth: "" })], 2, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.index === 0 && e.field === "firstName")).toBe(true);
      expect(result.errors.some((e) => e.index === 1 && e.field === "dateOfBirth")).toBe(true);
    }
  });

  it("rejects a date of birth that is not strictly in the past", () => {
    // @spec BOOKING-VAL-002
    const future = validatePassengers([makePassenger({ dateOfBirth: "2030-01-01" })], 1, NOW);
    expect(future.ok).toBe(false);
    const today = validatePassengers([makePassenger({ dateOfBirth: "2026-06-09" })], 1, NOW);
    expect(today.ok).toBe(false); // not strictly before now
  });

  it("rejects when the passenger count does not match the expected count", () => {
    // @spec BOOKING-VAL-003
    const tooFew = validatePassengers([makePassenger()], 2, NOW);
    expect(tooFew.ok).toBe(false);
    if (!tooFew.ok) expect(tooFew.errors.some((e) => e.field === "count")).toBe(true);

    const tooMany = validatePassengers([makePassenger(), makePassenger(), makePassenger()], 2, NOW);
    expect(tooMany.ok).toBe(false);
  });
});
