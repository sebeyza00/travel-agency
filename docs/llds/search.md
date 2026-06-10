# SEARCH — Trip Search Criteria & Form

## Context and Design Philosophy

SEARCH owns what an agent enters to describe a customer's trip and the validation that
makes a search well-formed before it reaches the FLIGHTS provider. It is intentionally a
thin segment: it produces a validated `SearchCriteria` object and hands it off. It does
not generate or rank options (FLIGHTS) and does not book (BOOKING).

Guiding principle: the criteria object is the single contract between the form and the
provider. Determinism downstream depends on it being a stable, fully-specified value, so
SEARCH normalizes and validates before handoff.

## SearchCriteria model

| Field | Type | Required | Notes |
|---|---|---|---|
| `origin` | string (IATA, 3 letters) | yes | Normalized uppercase |
| `destination` | string (IATA, 3 letters) | yes | Must differ from origin |
| `departureDate` | ISO date | yes | Not in the past |
| `returnDate` | ISO date \| null | no | Null = one-way; if set, ≥ `departureDate` |
| `flexibilityDays` | `0 \| 1 \| 3 \| 7` | yes | Default `0` (exact). Widens the date window symmetrically |
| `passengers` | integer | yes | 1–9 |
| `cabinClass` | `economy \| premium_economy \| business \| first` | yes | Default `economy` |
| `priceCeiling` | number \| null | no | Customer trip budget, total for all passengers; > 0 when set |
| `corporatePolicyId` | string \| null | no | References a predefined policy (see FLIGHTS) |

Currency is fixed to USD for the MVP (see AUDIT/FLIGHTS). `priceCeiling` is a *trip-level
budget* distinct from any corporate policy price rule.

## Validation rules

- `origin` and `destination` match `^[A-Za-z]{3}$`, are normalized to uppercase, and must
  differ *after* normalization (so `jfk`/`JFK` is rejected as identical). Any well-formed
  3-letter code is accepted — there is no real-airport allow-list (the mock generates for
  any route).
- `departureDate` is today or later, where **"today" is the agent's local calendar date**
  (the form runs in the browser; the local date is authoritative).
- If `returnDate` is present, it is ≥ `departureDate`. **Equality is allowed** —
  `returnDate == departureDate` is a valid same-day round-trip.
- `passengers` is an integer in 1–9.
- `priceCeiling`, when present, is a number > 0.
- `flexibilityDays` is one of the allowed values.

Invalid input is surfaced inline on the form; a search is not dispatched until the
criteria validate.

## Form UX (desktop)

```
┌────────────────────────────────────────────────────────────┐
│  New Flight Search                                          │
├────────────────────────────────────────────────────────────┤
│  From [ ___ ]   To [ ___ ]        ⇄                         │
│  Depart [ 2026-07-01 ]   Return [ 2026-07-08 ] (optional)   │
│  Date flexibility ( exact | ±1 | ±3 | ±7 days )             │
│  Passengers [ 2 ]   Cabin [ Economy ▾ ]                     │
│  Price ceiling (USD) [ ______ ] (optional)                  │
│  Corporate policy [ None ▾ ]                                │
│                                          [ Search flights ] │
└────────────────────────────────────────────────────────────┘
```

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Date flexibility model | Fixed set `0/1/3/7` days, symmetric | Free-form day range; min/max date pickers | Bounded set keeps the candidate window predictable and the UI simple |
| Passenger model | Single count (1–9) | Per-type breakdown (adult/child/infant) | MVP simplicity; per-passenger detail is captured at BOOKING |
| Trip types | One-way + round-trip | Multi-city | Multi-city is out of MVP scope |
| Currency | USD only | Multi-currency | MVP; the price breakdown carries a currency field for later |
| Price ceiling scope | Total for all passengers | Per-passenger | Matches how an agent thinks about a customer's trip budget |

## Open Questions & Future Decisions

### Resolved
1. ✅ "Not in the past" is evaluated against the **agent's local calendar date**.
2. ✅ Same-day round-trip (`returnDate == departureDate`) is **allowed**.
3. ✅ IATA inputs validate by **format only** (`^[A-Za-z]{3}$`), normalized uppercase, must
   differ after normalization; no real-airport allow-list in the MVP.

### Deferred
1. Airport autocomplete / typeahead — deferred; plain inputs for MVP.
2. Flexibility windows crossing month/year boundaries need no special handling — plain ISO
   date arithmetic.

## References

- `docs/llds/flights.md` — consumes `SearchCriteria`.
- `docs/high-level-design.md § System Design`.
