import { describe, it, expect } from "vitest";
import { generateReference, REFERENCE_ALPHABET, REFERENCE_LENGTH } from "@/lib/booking/reference";

describe("generateReference", () => {
  it("produces a 6-character code drawn only from the ambiguity-free alphabet", () => {
    // @spec BOOKING-API-002
    const allowed = new Set(REFERENCE_ALPHABET.split(""));
    for (let i = 0; i < 200; i++) {
      const ref = generateReference();
      expect(ref).toHaveLength(REFERENCE_LENGTH);
      for (const ch of ref) expect(allowed.has(ch)).toBe(true);
      expect(/[01OI]/.test(ref)).toBe(false); // no ambiguous characters
    }
  });
});
