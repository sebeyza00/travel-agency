// SEARCH segment — criteria model + validation contract.
// Traces to docs/llds/search.md and docs/specs/search.md.

export const CABIN_CLASSES = [
  "economy",
  "premium_economy",
  "business",
  "first",
] as const;
export type CabinClass = (typeof CABIN_CLASSES)[number];

export const FLEXIBILITY_DAYS = [0, 1, 3, 7] as const;
export type FlexibilityDays = (typeof FLEXIBILITY_DAYS)[number];

/** Normalized, validated search criteria — the contract handed to FLIGHTS. */
export interface SearchCriteria {
  origin: string; // 3-letter IATA, uppercase
  destination: string; // 3-letter IATA, uppercase, != origin
  departureDate: string; // ISO date (YYYY-MM-DD)
  returnDate: string | null; // null = one-way
  flexibilityDays: FlexibilityDays;
  passengers: number; // 1..9
  cabinClass: CabinClass;
  priceCeiling: number | null; // initial ceiling lens value; > 0 when set
  corporatePolicyId: string | null; // initial policy lens value
}

/** Loose form input prior to validation. `today` is injectable for tests. */
export interface RawSearchInput {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string | null;
  flexibilityDays?: number;
  passengers?: number | string;
  cabinClass?: string;
  priceCeiling?: number | string | null;
  corporatePolicyId?: string | null;
  /** Agent's local calendar date (ISO). Defaults to the real local date. */
  today?: string;
}

export interface FieldError {
  field: keyof SearchCriteria | "form";
  message: string;
}

export type ValidationResult =
  | { ok: true; criteria: SearchCriteria }
  | { ok: false; errors: FieldError[] };

function todayLocalISO(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function isCabinClass(value: unknown): value is CabinClass {
  return CABIN_CLASSES.includes(value as CabinClass);
}

function isFlexibilityDays(value: unknown): value is FlexibilityDays {
  return FLEXIBILITY_DAYS.includes(value as FlexibilityDays);
}

/**
 * Validate and normalize raw form input into SearchCriteria.
 * @spec SEARCH-VAL-001, SEARCH-VAL-002, SEARCH-VAL-003, SEARCH-VAL-004,
 *       SEARCH-VAL-005, SEARCH-VAL-006, SEARCH-VAL-007
 */
export function validateSearchCriteria(raw: RawSearchInput): ValidationResult {
  const errors: FieldError[] = [];
  const today = raw.today ?? todayLocalISO();

  // Airport codes — format then normalize (SEARCH-VAL-001).
  const rawOrigin = (raw.origin ?? "").trim();
  const rawDest = (raw.destination ?? "").trim();
  const iata = /^[A-Za-z]{3}$/;
  if (!iata.test(rawOrigin)) errors.push({ field: "origin", message: "Enter a 3-letter airport code." });
  if (!iata.test(rawDest)) errors.push({ field: "destination", message: "Enter a 3-letter airport code." });
  const origin = rawOrigin.toUpperCase();
  const destination = rawDest.toUpperCase();
  // Distinctness after normalization (SEARCH-VAL-002).
  if (iata.test(rawOrigin) && iata.test(rawDest) && origin === destination) {
    errors.push({ field: "destination", message: "Destination must differ from origin." });
  }

  // Departure date not in the past (SEARCH-VAL-003).
  const departureDate = (raw.departureDate ?? "").trim();
  if (!departureDate) {
    errors.push({ field: "departureDate", message: "Choose a departure date." });
  } else if (departureDate < today) {
    errors.push({ field: "departureDate", message: "Departure date cannot be in the past." });
  }

  // Return date optional; if present, >= departure (equality allowed) (SEARCH-VAL-004).
  const rawReturn = raw.returnDate == null ? null : `${raw.returnDate}`.trim() || null;
  if (rawReturn !== null && departureDate && rawReturn < departureDate) {
    errors.push({ field: "returnDate", message: "Return date must be on or after departure." });
  }

  // Passengers integer 1..9 (SEARCH-VAL-005).
  const passengers = Number(raw.passengers);
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 9) {
    errors.push({ field: "passengers", message: "Passengers must be a whole number from 1 to 9." });
  }

  // Cabin + flexibility membership.
  const cabinClass = raw.cabinClass;
  if (!isCabinClass(cabinClass)) errors.push({ field: "cabinClass", message: "Choose a cabin class." });
  const flexibilityDays = raw.flexibilityDays ?? 0;
  if (!isFlexibilityDays(flexibilityDays)) errors.push({ field: "flexibilityDays", message: "Invalid date flexibility." });

  // Price ceiling optional; if present, > 0 (SEARCH-VAL-006).
  const ceilingProvided = raw.priceCeiling !== null && raw.priceCeiling !== undefined && `${raw.priceCeiling}`.trim() !== "";
  let priceCeiling: number | null = null;
  if (ceilingProvided) {
    priceCeiling = Number(raw.priceCeiling);
    if (!Number.isFinite(priceCeiling) || priceCeiling <= 0) {
      errors.push({ field: "priceCeiling", message: "Price ceiling must be greater than zero." });
    }
  }

  // No criteria produced while any field is invalid (SEARCH-VAL-007).
  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    criteria: {
      origin,
      destination,
      departureDate,
      returnDate: rawReturn,
      flexibilityDays: flexibilityDays as FlexibilityDays,
      passengers,
      cabinClass: cabinClass as CabinClass,
      priceCeiling,
      corporatePolicyId: raw.corporatePolicyId ?? null,
    },
  };
}

/** Default initial criteria for an empty form. @spec SEARCH-UI-002 */
export function defaultSearchInput(): RawSearchInput {
  return {
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: null,
    flexibilityDays: 0,
    passengers: 1,
    cabinClass: "economy",
    priceCeiling: null,
    corporatePolicyId: null,
  };
}
