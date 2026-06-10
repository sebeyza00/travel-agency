# SEARCH — EARS Specs

Traces to `docs/llds/search.md`. Segment prefix: `SEARCH`.

## Search form

- [x] **SEARCH-UI-001**: The system shall present a search form with fields for origin, destination, departure date, return date (optional), date flexibility, passenger count, cabin class, price ceiling (optional), and corporate policy (optional).
- [x] **SEARCH-UI-002**: The system shall default date flexibility to exact (0 days) and cabin class to economy.
- [x] **SEARCH-UI-003**: When the agent submits the form with criteria that pass all validation, the system shall dispatch a search with the normalized `SearchCriteria`.

## Validation

- [x] **SEARCH-VAL-001**: When the agent enters origin or destination, the system shall accept only values matching `^[A-Za-z]{3}$` and shall normalize them to uppercase.
- [x] **SEARCH-VAL-002**: If origin and destination are equal after uppercase normalization, then the system shall reject the search.
- [x] **SEARCH-VAL-003**: If the departure date is earlier than the agent's local calendar date, then the system shall reject the search.
- [x] **SEARCH-VAL-004**: Where a return date is provided, the system shall require it to be on or after the departure date (same-day round-trips are valid), and shall reject the search otherwise.
- [x] **SEARCH-VAL-005**: If the passenger count is not an integer between 1 and 9 inclusive, then the system shall reject the search.
- [x] **SEARCH-VAL-006**: Where a price ceiling is provided, the system shall require it to be greater than zero, and shall reject the search otherwise.
- [x] **SEARCH-VAL-007**: If any field fails validation, then the system shall display an inline error for that field and shall not dispatch a search.
