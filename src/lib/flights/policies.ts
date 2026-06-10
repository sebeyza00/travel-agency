// FLIGHTS segment — corporate policy catalog + compliance evaluation.
// Traces to docs/llds/flights.md § Corporate-policy compliance.

import type { CabinClass } from "@/lib/search/criteria";
import type { ComplianceResult, FlightOption } from "@/lib/flights/types";

export interface CorporatePolicy {
  id: string;
  name: string;
  maxCabin?: CabinClass; // cabin rank must be <= this
  maxStops?: number; // per-itinerary stop ceiling
  maxPricePerPassenger?: number; // USD
}

/** Predefined MVP policy catalog. `none` carries no rules. */
export const POLICIES: Record<string, CorporatePolicy> = {
  none: { id: "none", name: "None" },
  standard: {
    id: "standard",
    name: "Standard",
    maxCabin: "economy",
    maxStops: 1,
    maxPricePerPassenger: 800,
  },
  executive: {
    id: "executive",
    name: "Executive",
    maxCabin: "business",
    maxStops: 2,
    maxPricePerPassenger: 5000,
  },
};

export function getPolicy(policyId: string | null): CorporatePolicy {
  return POLICIES[policyId ?? "none"] ?? POLICIES.none;
}

const CABIN_RANK: Record<CabinClass, number> = {
  economy: 0,
  premium_economy: 1,
  business: 2,
  first: 3,
};

const CABIN_LABEL: Record<CabinClass, string> = {
  economy: "economy",
  premium_economy: "premium economy",
  business: "business",
  first: "first",
};

/**
 * Evaluate one option against a policy, listing every violation.
 * @spec FLIGHTS-POL-001, FLIGHTS-POL-003
 */
export function evaluateCompliance(
  option: FlightOption,
  policyId: string | null,
): ComplianceResult {
  const policy = getPolicy(policyId);
  const violations: string[] = [];

  if (policy.maxCabin && CABIN_RANK[option.cabinClass] > CABIN_RANK[policy.maxCabin]) {
    violations.push(
      `Cabin ${CABIN_LABEL[option.cabinClass]} exceeds policy maximum ${CABIN_LABEL[policy.maxCabin]}.`,
    );
  }

  if (policy.maxStops != null) {
    const stops = Math.max(option.outbound.stops, option.return?.stops ?? 0);
    if (stops > policy.maxStops) {
      violations.push(`${stops} stops exceeds policy maximum ${policy.maxStops}.`);
    }
  }

  if (policy.maxPricePerPassenger != null && option.price.perPassenger > policy.maxPricePerPassenger) {
    violations.push(
      `Fare $${option.price.perPassenger} per passenger exceeds policy limit $${policy.maxPricePerPassenger}.`,
    );
  }

  return { compliant: violations.length === 0, violations };
}
