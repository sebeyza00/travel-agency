# EMAIL — EARS Specs

Traces to `docs/llds/email.md`. Segment prefix: `EMAIL`.

## Sender

- [x] **EMAIL-API-001**: When `send` resolves successfully, the MockEmailSender shall record the sent message and expose it via its list of sent messages.
- [x] **EMAIL-API-002**: When constructed in failing mode, the MockEmailSender shall reject `send` and record no message.

## Confirmation template

- [x] **EMAIL-DATA-001**: When rendering a confirmation email for a booking, the system shall address it to the given customer email, set a subject naming the booking reference, and produce a body containing the reference, airline, outbound itinerary, the return itinerary only when the booking is round-trip, cabin class, passenger names, the price breakdown and total, and the booking timestamp.
