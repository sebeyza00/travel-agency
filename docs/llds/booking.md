# BOOKING — Selection, Passenger Capture & Confirmation

## Context and Design Philosophy

BOOKING turns a chosen `FlightOption` into a durable, confirmed booking the agent can hand
to the customer. It owns option selection, passenger capture, reference-number generation,
and the confirmation view. It depends on AUDIT for persistence (it does not write the
database directly — it calls the AUDIT persistence layer), and on FLIGHTS for the option
shape it snapshots.

Guiding principle: a booking is a **snapshot**. Because flights are mocked and regenerated
on demand, the booking must capture the full priced itinerary at booking time so the record
stands on its own forever, independent of any later search.

## Booking flow

```
Results list ──[ Book ]──► Passenger capture ──[ Confirm booking ]──► Confirmation
                                   │                                       │
                                   └── POST /api/bookings ──► AUDIT.persist ─┘
```

1. Agent clicks **Book** on a `FlightOption` (compliant or not — a non-compliant option can
   still be booked; the agent owns that call).
2. Passenger capture: one row per passenger, count fixed to `criteria.passengers`.
3. On **Confirm booking**, the client POSTs the option snapshot + passengers + optional
   customer email to the server. The **Confirm button is disabled on first click** to guard
   against accidental double-submit; there is no server-side idempotency key in the MVP
   (single trusted user — see Open Questions).
4. Server generates a reference number, persists via AUDIT (including the customer email),
   then — **after** the booking is durably persisted — best-effort sends the confirmation
   email via EMAIL if a customer email was given. The response carries the saved booking and
   an `emailStatus` of `sent | failed | skipped`.
5. Confirmation view renders the full record and the email status.

The email send is sequenced strictly after persistence and never affects it: a send failure
yields `emailStatus: "failed"` but the booking is returned and confirmed regardless
(see `docs/llds/email.md § Invocation & failure model`).

**Booking-request failure vs. email failure are distinct.** A persisted booking returns an
HTTP success response carrying `emailStatus`; the client shows the confirmation (with the
status line). `BOOKING-UI-006`'s "confirm request failed → error, no confirmation" applies
only when the booking itself did not persist (a non-success response or thrown request). The
client decides which path to take from the HTTP outcome, not from `emailStatus`.

Snapshots are taken by **serializing the option and criteria to JSON at persist time**,
which is inherently a deep copy — later mutation of any in-memory object cannot alter a
stored booking.

## Passenger model

| Field | Type | Required | Notes |
|---|---|---|---|
| `firstName` | string | yes | |
| `lastName` | string | yes | |
| `dateOfBirth` | ISO date | yes | Must be in the past |

Exactly `criteria.passengers` passengers are required; the booking cannot be confirmed with
fewer or more (the form renders exactly that many passenger rows). `dateOfBirth` must be a
date strictly in the past relative to booking time; no minimum/maximum age check in the MVP.
No passport fields in the MVP.

## Customer email (optional)

The booking step also captures a single **optional booking-level customer email** (not
per-passenger). It is the address the confirmation is emailed to (see `docs/llds/email.md`).

- Optional: a booking may be confirmed with no customer email (the agent still hands over
  the on-screen confirmation). An empty or whitespace-only field counts as **not provided**
  and yields `emailStatus: "skipped"` — never a send attempt.
- If provided, it must look like an email address (`^[^@\s]+@[^@\s]+\.[^@\s]+$`); an
  ill-formed address blocks confirmation with an inline error.
- Captured in the booking step UI alongside the passenger rows; on confirm it is included in
  the booking submission. The passenger-capture contract (`PassengerForm`) is unchanged; the
  email field and its validation live in the surrounding booking flow.

## Reference number

- Format: 6-character uppercase alphanumeric record locator (PNR-style), e.g. `K4D9TZ`.
- Excludes easily-confused characters (`0/O`, `1/I`) to reduce read-aloud errors.
- Unique across the `bookings` table; on the rare `UNIQUE` collision, regenerate, **up to 5
  attempts**, then surface an error (booking not created) rather than looping unbounded.
- Generated server-side at persist time (not deterministic — a booking is a real event).

## Booking record (snapshot)

A confirmed booking captures, at minimum:

- `reference`, `createdAt`
- `criteriaSnapshot` — the `SearchCriteria` that produced the option
- `optionSnapshot` — the full `FlightOption` (airline, itinerary/legs/times, stops,
  duration, price breakdown, cabin, **compliance result computed under the policy lens
  active in the results view at booking time** — see FLIGHTS view lenses)
- `passengers` — the captured list
- `customerEmail` — the optional customer email (`null` when not provided)
- `totalPrice`, `currency`, `cabinClass`, `status` (`confirmed` for MVP)

`emailStatus` (`sent | failed | skipped`) is **not** part of the persisted booking — it is a
transient outcome of the post-commit send, returned in the API response for the confirmation
view. Persistence shape and the audit entry are owned by AUDIT (`docs/llds/audit.md`).

## Confirmation view

```
┌────────────────────────────────────────────────────────────┐
│  Booking confirmed   Ref: K4D9TZ                            │
├────────────────────────────────────────────────────────────┤
│  Delta DL482  JFK 08:15 → LAX 11:40   Nonstop   5h25m       │
│  Return DL931 LAX 18:00 → JFK 02:20+1 Nonstop   5h20m       │
│  Cabin: Economy                                             │
│  Passengers: Jane Doe, John Doe                             │
│  Price: base $420 + taxes $58 + fees $22 = $500 ×2 = $1000  │
│  Booked: 2026-06-09 14:32                                   │
│  ✉ Confirmation emailed to jane@example.com                 │
│                                  [ Print / hand to customer ]│
└────────────────────────────────────────────────────────────┘
```

The confirmation is the artifact the agent passes to the customer; it contains everything
needed without a login. An **email-status line** reflects the post-commit send:

- `sent` → "Confirmation emailed to {address}".
- `failed` → "Couldn't email the confirmation — the booking is still confirmed." (the agent
  can still hand over / print the on-screen confirmation).
- `skipped` → no email line (no address was given).

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Booking = snapshot | Store full option + criteria at booking time | Reference back to a live search | Mocked flights are regenerated; the record must stand alone |
| Non-compliant booking | Allowed; agent's call | Block booking of flagged options | Policy flags inform; they don't override the agent (per HLD) |
| Passenger fields | name + DOB only | + passport | MVP minimalism; no ticketing yet |
| Customer email | One optional booking-level address | Required; per-passenger emails | Email is optional (never blocks a booking); the customer is one recipient, not per-traveller |
| Email-send timing | After commit, in the booking route; status returned, not persisted | Inside the booking transaction; persist emailStatus | A notification must not gate durability; status is transient UI feedback (see EMAIL LLD) |
| Reference format | 6-char ambiguity-free alphanumeric | Sequential integer; UUID | PNR-like, human-readable over the phone |
| Persistence ownership | BOOKING calls AUDIT layer | BOOKING writes DB directly | Keeps the audit write and booking write atomic in one owner (AUDIT) |

## Open Questions & Future Decisions

### Resolved
1. ✅ Double-submit guarded client-side (disabled Confirm button); no server idempotency key.
2. ✅ Reference-number generation retries up to 5 times on collision, then errors.
3. ✅ `dateOfBirth` must be strictly in the past at booking time; no age bounds.
4. ✅ Snapshots are JSON-serialized at persist time (deep copy by construction).

### Deferred
1. Cancellation / modification of a booking — out of MVP scope (status is always `confirmed`).
2. Printable/exportable confirmation (PDF) vs. on-screen only — MVP is on-screen.
3. **Server-side idempotency key** for retry-safe booking — deferred hardening; the MVP
   relies on the client button guard only.

## References

- `docs/llds/flights.md` — `FlightOption` shape.
- `docs/llds/audit.md` — persistence + audit write.
