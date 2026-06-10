// BOOKING segment — reference-number generation.
// Traces to docs/specs/booking.md BOOKING-API-002.

// 6-char uppercase alphanumeric, excluding ambiguous 0/O/1/I.
export const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REFERENCE_LENGTH = 6;

/** Generate a single candidate reference number. @spec BOOKING-API-002 */
export function generateReference(): string {
  let ref = "";
  for (let i = 0; i < REFERENCE_LENGTH; i++) {
    ref += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  }
  return ref;
}
