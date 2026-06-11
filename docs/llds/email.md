# EMAIL — Confirmation Email Sender

## Context and Design Philosophy

EMAIL owns outbound email: the `EmailSender` interface, its mock implementation, and the
confirmation email template. It is the project's first customer-facing, outbound-integration
boundary. Like FLIGHTS, the real integration is deliberately deferred behind an interface so
a real provider can replace the mock without touching the booking flow.

Guiding principle: **email is a notification, not a transaction.** EMAIL never owns the
booking's durability — it is invoked *after* a booking is persisted, on a best-effort basis,
and a send failure is reported, not fatal. The booking is the source of truth.

## EmailSender interface

```ts
interface EmailMessage {
  to: string;
  subject: string;
  body: string; // plain text (MVP)
}

interface EmailSender {
  // Resolves on success; rejects/throws on delivery failure.
  send(message: EmailMessage): Promise<void>;
}
```

The MVP ships only `MockEmailSender`. A real provider (Resend/SendGrid/SMTP) would satisfy
the same interface; the booking route would not change.

## MockEmailSender

- Records every successfully "sent" message in an in-memory list (`sent: EmailMessage[]`),
  exposed for inspection/tests — the mock equivalent of "delivered".
- Can be constructed to **fail** (`new MockEmailSender({ failing: true })`) so the
  best-effort failure path is testable; in failing mode `send` rejects and records nothing.
- Default app instance is a process-wide singleton (non-failing).

## Confirmation email template

```ts
function renderConfirmationEmail(booking: SavedBooking, to: string): EmailMessage;
```

- `to` is the customer email captured at booking.
- `subject`: `Your flight booking is confirmed — {reference}`.
- `body` (plain text): greeting + the same facts as the on-screen confirmation — reference,
  airline, outbound/return itinerary with times/stops/duration, cabin, passenger names,
  price breakdown and total, and the booking timestamp.
- The template is a pure function of the booking; no side effects.

## Invocation & failure model

EMAIL is invoked by the BOOKING route (`/api/bookings`), **after** `createBooking` returns:

1. If no customer email was supplied → do not send (status `skipped`).
2. Otherwise render the email and call `send`.
   - `send` resolves → status `sent`.
   - `send` rejects → status `failed`; the error is swallowed (logged), the booking stands.
3. The route returns the saved booking plus the resulting email status.

Email delivery is **not** written to the finance `audit_log` in this MVP (the mock sender's
own record suffices); a `confirmation_emailed` audit event is a deferred option.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Integration | Mock behind `EmailSender` interface | Real provider now | Consistent with mock-provider pattern; no external dependency for the MVP |
| Body format | Plain text | HTML template | MVP simplicity; HTML is a later enhancement |
| Failure semantics | Best-effort after commit; failure reported, not fatal | Send inside booking transaction; block booking on failure | A notification must never cost a durable booking |
| Delivery record | Mock sender's in-memory `sent` list | `confirmation_emailed` row in `audit_log` | Keeps the finance ledger booking-only; ops trail deferred |

## Open Questions & Future Decisions

### Deferred
1. Real transactional provider + deliverability (bounces, retries, queue).
2. HTML email template and branding.
3. A `confirmation_emailed` audit event if ops wants a delivery trail.

## References

- `docs/llds/booking.md` — supplies the saved booking and the customer email; triggers send.
- `docs/high-level-design.md § Approach` (discipline 5, optional confirmation email).
