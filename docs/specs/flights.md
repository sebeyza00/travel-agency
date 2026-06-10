# FLIGHTS — EARS Specs

Traces to `docs/llds/flights.md`. Segment prefix: `FLIGHTS`.

## Provider & completeness contract

- [x] **FLIGHTS-API-001**: When a valid search is dispatched, the flight provider shall return a `SearchResult` whose `total` equals the length of its `options` array (the complete candidate set, with no pagination, sampling, or cap).
- [x] **FLIGHTS-API-002**: For any well-formed route and date, the MVP mock provider shall return at least one option.
- [x] **FLIGHTS-API-003**: Given two identical `SearchCriteria`, the mock provider shall return an identical result set (deterministic generation seeded from the criteria).
- [x] **FLIGHTS-API-004**: When the mock provider generates an itinerary, each itinerary shall have a non-empty `legs` array in temporal order, with every leg's arrival time after its departure time and every connection's layover at or above the minimum connection time.
- [x] **FLIGHTS-API-005**: When the provider returns an option, it shall include the airline, an outbound itinerary, a return itinerary if and only if the search is round-trip, the requested cabin class, and a price breakdown.
- [x] **FLIGHTS-API-006**: Where the search specifies date flexibility of N days (N in {1, 3, 7}), the provider's complete candidate set shall include options for departure dates spanning the symmetric ±N-day window around the requested departure date.
- [x] **FLIGHTS-API-007**: Where a round-trip search specifies date flexibility, the provider shall, for each candidate departure date in the window, set the return date so as to preserve the originally requested trip length (returnDate − departureDate); it shall not produce the full cross-product of departure and return dates.

## Option & price model

- [x] **FLIGHTS-DATA-001**: For every option's price breakdown, the total shall equal baseFare + taxes + fees, the per-passenger amount shall equal total divided by the passenger count, and the currency shall be USD (MVP).
- [x] **FLIGHTS-DATA-002**: Each itinerary shall carry a strictly-positive estimated CO2 emissions value in kilograms (`co2Kg`), generated deterministically and scaling with flight duration and stop count; an option's total emissions are the sum of its outbound and (when round-trip) return itinerary emissions.

## Results view & completeness presentation

- [x] **FLIGHTS-UI-001**: While viewing results, the system shall display the total option count in the form "N of M options", where M is the result's `total`.
- [x] **FLIGHTS-UI-002**: While viewing results, sorting and filtering shall operate client-side over the complete set and shall never change M (the total).
- [x] **FLIGHTS-UI-003**: Where any filter is applied, the system shall change only the visible subset N, and shall provide a one-click "Clear filters" action that returns the view to all M options.
- [x] **FLIGHTS-UI-004**: When displaying an option, the system shall show the airline, departure and arrival times, stop count, total duration, the price breakdown, and the estimated total CO2 emissions in kilograms.
- [x] **FLIGHTS-UI-005**: While viewing results, the system shall allow sorting by total price, total duration, departure time, stop count, and total CO2 emissions (emissions sorted ascending, lowest first).
- [x] **FLIGHTS-UI-006**: While viewing results, the system shall allow filtering by stop count, airline, departure-time window, and price range, where stop-count filtering considers the whole trip (the maximum of the outbound and return stop counts).
- [x] **FLIGHTS-UI-007**: While the result total M is zero (reserved for a future real provider; the MVP mock always returns at least one), the system shall display an explicit "No options found — none were hidden" empty state rather than a blank view.
- [x] **FLIGHTS-UI-008**: Where a price ceiling is set on the search, the system shall hide options whose total price exceeds the ceiling by default while still counting them in M, indicate how many are within budget, and provide a one-click action to reveal them.
- [x] **FLIGHTS-UI-011**: While viewing results, the system shall provide a non-stop-only toggle that, when enabled, hides every option with one or more stops in either direction from the visible subset N while keeping those options counted in M, and when disabled (or when filters are cleared) restores them.
- [x] **FLIGHTS-UI-012**: While the result total M is greater than zero but the active filters leave no options visible (N = 0), the system shall display a "No options match your filters" message with a one-click action to clear filters, distinct from the M = 0 empty state.

## Corporate-policy compliance (flag, never filter)

- [x] **FLIGHTS-POL-001**: Where a corporate policy is selected, the system shall evaluate each option against the policy and display a non-compliance badge with the list of violation reasons on every option that violates it.
- [x] **FLIGHTS-POL-002**: Where a corporate policy is selected, the system shall never remove or hide a non-compliant option on account of the policy (compliance flags, it does not filter).
- [x] **FLIGHTS-POL-003**: Where no corporate policy is selected (policy is "none" or null), the system shall treat every option as compliant with an empty violations list.
- [x] **FLIGHTS-POL-004**: Where both a price ceiling and a corporate policy apply, the system shall treat ceiling filtering and compliance flagging as independent — an option may be hidden by the ceiling filter and still carry its violation reasons when revealed.
- [x] **FLIGHTS-POL-005**: While viewing results, the system shall let the agent change the active corporate policy and recompute every option's compliance flags client-side over the complete set without re-fetching, leaving M unchanged.

## View lenses

- [x] **FLIGHTS-UI-009**: While viewing results, the system shall let the agent adjust or clear the price ceiling and recompute which options are hidden client-side over the complete set without re-fetching, leaving M unchanged.
- [x] **FLIGHTS-UI-010**: The system shall treat route, dates, date flexibility, passenger count, and cabin class as the search query (changing any of them requires a new search), and shall treat corporate policy and price ceiling as view lenses over the existing result set (changing either does not re-fetch).
