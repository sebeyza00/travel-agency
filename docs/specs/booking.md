# BOOKING — EARS Specs

Traces to `docs/llds/booking.md`. Segment prefix: `BOOKING`.

## Selection & passenger capture

- [x] **BOOKING-UI-001**: When the agent clicks "Book" on an option, the system shall open a passenger-capture step for that option.
- [x] **BOOKING-UI-002**: While capturing passengers, the system shall render exactly `criteria.passengers` passenger rows, each with first name, last name, and date of birth.
- [x] **BOOKING-UI-003**: When the agent clicks "Book" on an option that is non-compliant with the selected corporate policy, the system shall still allow the booking to proceed.
- [x] **BOOKING-VAL-001**: When confirming a booking, the system shall require a first name, last name, and date of birth for every passenger.
- [x] **BOOKING-VAL-002**: If any passenger's date of birth is not strictly earlier than the booking time, then the system shall reject the booking.
- [x] **BOOKING-VAL-003**: If the number of completed passenger entries is not exactly `criteria.passengers`, then the system shall not allow the booking to be confirmed.

## Confirm & persist

- [x] **BOOKING-UI-004**: When the agent clicks "Confirm booking", the system shall disable the confirm control to prevent double-submit and shall send the option snapshot and passengers to the server.
- [x] **BOOKING-API-001**: When the server receives a confirm request, it shall generate a unique reference number, persist the booking via the AUDIT store, and return the saved booking.
- [x] **BOOKING-API-002**: When generating a reference number, the system shall produce a 6-character uppercase alphanumeric record locator excluding the ambiguous characters 0, O, 1, and I.
- [x] **BOOKING-API-003**: If a generated reference number collides with an existing one, then the system shall regenerate up to 5 attempts and, if all collide, return an error without creating a booking.
- [x] **BOOKING-API-004**: When persisting a booking, the system shall capture a JSON snapshot of the search criteria, the full option (airline, itinerary, price breakdown, cabin, and the compliance result computed under the policy lens active at booking time), the passengers, the total price, currency, cabin class, and a status of "confirmed".

## Confirmation

- [x] **BOOKING-UI-005**: When a booking is persisted successfully, the system shall display a confirmation showing the reference number, the full itinerary, cabin class, passengers, price breakdown, and the booking timestamp.
- [x] **BOOKING-UI-006**: If the confirm request fails, then the system shall display an error and shall not show a confirmation.
