# FLIGHTS — Provider, Options & Completeness Contract

## Context and Design Philosophy

FLIGHTS is the trust core of the product. It owns the `FlightProvider` interface, the
deterministic exhaustive mock behind it, the `FlightOption` / price-breakdown model, the
**completeness contract**, the client-side sort/filter behavior, and corporate-policy
compliance flagging.

The non-negotiable invariant: for a given `SearchCriteria`, the provider returns the
*entire* candidate set — there is no hidden tail — and every downstream view preserves the
agent's ability to know the total and to recover the full set. Trust is the feature.

## FlightProvider interface

```ts
interface FlightProvider {
  search(criteria: SearchCriteria): Promise<SearchResult>;
}

interface SearchResult {
  options: FlightOption[];
  total: number; // invariant: total === options.length — the complete set
}
```

The mock implementation (`MockFlightProvider`) is the only implementation in the MVP. A
real GDS implementation would satisfy the same interface; the completeness contract would
then need re-examination (real APIs paginate) — tracked as a future decision, not MVP work.

## FlightOption model

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable within a result set (derived from criteria seed + index) |
| `airline` | `{ name: string; code: string }` | e.g. `{ name: "Delta", code: "DL" }` |
| `outbound` | `Itinerary` | Required |
| `return` | `Itinerary \| null` | Present iff round-trip |
| `cabinClass` | same enum as SearchCriteria | Echoes requested cabin |
| `price` | `PriceBreakdown` | See below |
| `compliance` | `ComplianceResult` | Computed against the selected policy (see below) |

```ts
interface Itinerary {
  legs: Leg[];              // 1 leg = nonstop; N legs = N-1 stops
  durationMinutes: number;  // total incl. layovers
  stops: number;            // legs.length - 1
}
interface Leg {
  flightNumber: string;
  departAirport: string; departTime: ISODateTime;
  arriveAirport: string; arriveTime: ISODateTime;
}
interface PriceBreakdown {
  baseFare: number; taxes: number; fees: number; total: number;
  currency: "USD"; perPassenger: number; passengers: number;
}
```

`total = (baseFare + taxes + fees)` is the all-passenger total; `perPassenger = total / passengers`.

## Deterministic exhaustive generation

- The mock seeds a PRNG from a hash of the **query fields** of the search — route, dates,
  flexibility, passengers, cabin. **Same query → identical result set**, every time. Policy
  and price ceiling are *not* query fields (they are view lenses, below) and are excluded
  from the seed.
- For each candidate departure date in the flexibility window, the generator emits a
  deterministic spread of options across a fixed roster of mock airlines, with varied stop
  counts, times, durations, and prices. **Date-flexibility pairing:**
  - *One-way* (`returnDate == null`): the window applies to the departure date only; every
    option has `return: null`.
  - *Round-trip*: the whole trip slides — for each candidate departure date in the ±N-day
    window, the return date shifts to **preserve the trip length** the agent entered
    (`returnDate − departureDate`). The window therefore yields one date-pair per candidate
    departure date, not a full cross-product.
- `total` is set to `options.length`. There is no pagination, no sampling, no cap.
- **Generator invariants** — every emitted itinerary is internally valid: `legs` is
  non-empty, legs are in temporal order, each leg's `arriveTime > departTime`, and each
  connection's layover is ≥ a minimum connection time. The mock never emits an impossible
  itinerary.
- **The mock always returns at least one option** for any well-formed route/date, so a
  literal empty set does not arise in the MVP. (See the empty-state contract below — the UI
  still defines the zero case so the completeness contract survives a future real provider.)
- Price ceiling and corporate policy do **not** affect generation — the full set is always
  produced; they affect presentation only (filter / flag respectively).

## Completeness contract (the trust invariant)

1. The provider returns the complete set; `total === options.length`.
2. The results view always displays the total ("**N of M options**", where M = total).
3. **Sort and filter are client-side over the complete set and never drop options from the
   total.** Filtering changes only the visible subset N; M is invariant for a given result set.
4. A one-click **Clear filters** returns the view to all M options.
5. Re-running the identical search yields the identical set (determinism).
6. **Empty-state contract** — when M = 0 (cannot occur with the MVP mock, reserved for a
   future real provider), the view shows an explicit "No options found — none were hidden"
   state rather than a blank screen, preserving the "nothing was silently dropped" promise.

## Sort & filter

- **Sort by**: price (total), total duration, departure time, stops.
- **Filter by**: stop count (nonstop / 1 / 2+), airline(s), departure-time window, price range.
- **Price ceiling** from the search applies as an *initial, clearable* filter: options whose
  `price.total` exceeds the ceiling are hidden by default but remain counted in M, and the
  view shows e.g. "12 of 40 within budget — Clear to see all". This preserves hide-never-drop.
  *(Flagged for Phase 4 confirmation — see Open Questions.)*

## View lenses: policy and price ceiling

The dispatched **query** is route + dates + flexibility + passengers + cabin; changing any
of these re-fetches. **Corporate policy and price ceiling are not query fields — they are
view lenses applied client-side over the already-complete result set:**

- Both are *pure functions of the complete set*. Compliance flagging recomputes from the
  selected policy; ceiling hiding recomputes from the ceiling value.
- The agent can switch the active policy or adjust/clear the ceiling **in the results view
  without re-fetching**. M (the total) never changes; only flags and visibility do.
- The search form seeds the initial lens values (`corporatePolicyId`, `priceCeiling`); they
  are mutable thereafter without a new search.

## Corporate-policy compliance (flag, never filter)

Predefined policies (MVP, in code):

| id | name | Rules |
|---|---|---|
| `none` | None | no rules; everything compliant |
| `standard` | Standard | cabin ≤ economy; stops ≤ 1; total ≤ $800 × passengers |
| `executive` | Executive | cabin ≤ business; stops ≤ 2; total ≤ $5000 × passengers |

```ts
interface ComplianceResult {
  compliant: boolean;
  violations: string[]; // human-readable reasons, empty when compliant
}
```

- Each option is evaluated against the selected policy; `compliant=false` options get a
  visible badge plus the `violations` list. **They are never removed or hidden** — this is
  the deliberate difference from price-ceiling filtering and from a hard policy filter.
- When `corporatePolicyId` is `none`/null, every option is compliant with empty violations.
- **Ceiling and compliance are independent and compose.** An option can be both hidden by
  the price-ceiling filter *and* carry a non-compliance badge: the badge is part of the
  option's data, so when the option becomes visible again (via Clear filters) its violations
  are shown. Neither signal suppresses the other.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Completeness | Provider returns entire set, `total===length` | Paginated/sampled results | The product's core trust guarantee |
| Determinism | Seed PRNG from criteria | Random per request | Reproducibility = trust + testability |
| Sort/filter locus | Client-side over complete set | Server re-query per filter | Server re-query risks appearing to "lose" options |
| Policy enforcement | Flag + list violations, never filter | Hard filter; ignore policy | Keeps set complete (trust) while surfacing violations; agent decides |
| Price ceiling | Initial clearable filter (hide-not-drop) | Hard drop; flag like policy | Honors budget while preserving recoverability of full set |
| Policy catalog | Small predefined in-code set | Free-form rule editor; DB-backed policies | MVP simplicity; realistic (companies have named policies) |

## Open Questions & Future Decisions

### Resolved
1. ✅ The mock always returns ≥1 option; the UI nonetheless defines an explicit empty state
   so the completeness contract holds for a future real provider.
2. ✅ Price-ceiling filtering and compliance flagging are independent and compose.
3. ✅ Generator only emits temporally-valid itineraries (ordered legs, positive leg
   durations, minimum connection times).
4. ✅ **Price-ceiling treatment** (was deferred to Phase 4): a clearable view lens (hide,
   never drop), not a flag.
5. ✅ **Policy and ceiling are view lenses** over the complete set, recomputed client-side;
   route/dates/flex/passengers/cabin are the query. Changing a lens never re-fetches.
6. ✅ **Round-trip flexibility preserves trip length** (one date-pair per candidate departure
   date), not a departure×return cross-product. One-way flexes the departure date only.

### Deferred
1. Real-GDS completeness contract (pagination) — out of MVP scope.
2. Per-option seat availability / fare classes — not modeled in MVP.

## References

- `docs/llds/search.md` — produces `SearchCriteria`.
- `docs/llds/booking.md` — consumes a selected `FlightOption`.
- `docs/high-level-design.md § Key Design Decisions`.
