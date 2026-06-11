# AUDIT — Persistence & Finance Audit Log

## Context and Design Philosophy

AUDIT owns durable storage. Every booking is written to SQLite together with an
**append-only** audit-log entry so finance can reconcile later. AUDIT is the only segment
that touches the database; BOOKING calls into it.

Guiding principle: the audit log is a ledger. Entries are written once and never updated or
deleted. The `bookings` table is the operational record; `audit_log` is the immutable
financial trail. The two are written in a single transaction so a booking can never exist
without its audit entry (a falsification signal in the HLD).

## Storage engine

- **SQLite** via `better-sqlite3` (synchronous, no separate server, single file at
  `data/travel-agency.db`). Route handlers run in the Node runtime (not edge).
- Schema created/migrated by an idempotent init routine run at server startup.
- **Additive column migrations.** `CREATE TABLE IF NOT EXISTS` does not alter a table that
  already exists, so new nullable columns (e.g. `customer_email`) are added by an idempotent
  step that inspects `PRAGMA table_info(bookings)` and issues `ALTER TABLE ... ADD COLUMN`
  only when the column is absent. This lets a database created by an earlier version pick up
  the new column without data loss.

## Schema

```sql
CREATE TABLE IF NOT EXISTS bookings (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  reference        TEXT    NOT NULL UNIQUE,
  created_at       TEXT    NOT NULL,            -- ISO-8601
  origin           TEXT    NOT NULL,
  destination      TEXT    NOT NULL,
  depart_date      TEXT    NOT NULL,
  return_date      TEXT,                        -- null = one-way
  cabin_class      TEXT    NOT NULL,
  passengers_count INTEGER NOT NULL,
  total_price      REAL    NOT NULL,
  currency         TEXT    NOT NULL DEFAULT 'USD',
  status           TEXT    NOT NULL DEFAULT 'confirmed',
  customer_email   TEXT,                        -- optional confirmation recipient; null if none
  agent_email      TEXT,                        -- the agent who made the booking (null for legacy rows)
  criteria_json    TEXT    NOT NULL,            -- full SearchCriteria snapshot
  option_json      TEXT    NOT NULL,            -- full FlightOption snapshot
  passengers_json  TEXT    NOT NULL             -- full passenger list snapshot
);

CREATE TABLE IF NOT EXISTS audit_log (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id        INTEGER NOT NULL REFERENCES bookings(id),
  booking_reference TEXT    NOT NULL,
  event_type        TEXT    NOT NULL,           -- 'booking_created'
  occurred_at       TEXT    NOT NULL,           -- ISO-8601
  actor             TEXT    NOT NULL DEFAULT 'internal-agent',
  amount            REAL    NOT NULL,
  currency          TEXT    NOT NULL DEFAULT 'USD',
  payload_json      TEXT    NOT NULL            -- reconciliation snapshot
);

CREATE INDEX IF NOT EXISTS idx_audit_occurred_at ON audit_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(reference);
```

## Persistence API

```ts
interface AuditStore {
  // Writes the booking row AND its audit_log row in ONE transaction.
  // Generates a unique reference (retries on UNIQUE collision).
  createBooking(input: BookingInput): SavedBooking;
}
```

- `customer_email` stores the optional confirmation recipient captured at booking (`null`
  when none was given). It is part of the booking record only; it is **not** copied into the
  finance `AuditPayload` (email is not finance data) and email *delivery* is not logged here
  (see EMAIL LLD).
- `actor` is the **email of the authenticated agent** who made the booking (supplied by
  AUTH via the booking route). When no agent is supplied (e.g. a legacy/unauthenticated
  call), it falls back to the constant `'internal-agent'`. The booking's `agent_email`
  column records the same attribution on the operational row.
- `event_type` is `'booking_created'` in the MVP; the column generalizes to future events
  (e.g. `'booking_cancelled'`) without schema change.
- `payload_json` carries everything finance needs to reconcile a line item without joining.
  Its schema is fixed:

  ```ts
  interface AuditPayload {
    reference: string;
    route: { origin: string; destination: string };
    dates: { departDate: string; returnDate: string | null };
    cabinClass: string;
    passengersCount: number;
    priceBreakdown: { baseFare: number; taxes: number; fees: number; total: number };
    total: number;
    currency: "USD";
    occurredAt: string; // ISO-8601
  }
  ```

## Append-only discipline

- `audit_log` rows are only ever `INSERT`ed. No `UPDATE`/`DELETE` paths exist in the
  AuditStore API. Corrections are modeled as new events, never edits.
- `bookings` rows are inserted; `status` is the only mutable field reserved for future
  lifecycle events (cancellation), unused in the MVP.

## Failure behavior

If the database is unreachable, locked, or a write fails, `createBooking` **fails hard** —
the transaction rolls back (so no partial booking/audit row survives) and the error
propagates to the agent as a clear "booking could not be saved" message. The MVP has no
retry, health-check, or degraded-mode logic; a failed booking is simply not created and the
agent retries the action.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Engine | SQLite (`better-sqlite3`) | JSON/JSONL files; hosted Postgres | Real queryable store, zero infra, migratable later |
| Atomicity | Booking + audit in one transaction | Two separate writes | Guarantees no booking without an audit row (HLD falsification signal) |
| Audit mutability | Append-only, inserts only | Editable rows | A finance ledger must be immutable |
| Snapshot in DB | Full JSON snapshots alongside flat columns | Foreign keys to live data | Mocked flights regenerate; the record must stand alone |
| Actor field | Constant `'internal-agent'` | Omit the column | Forward-compat for real identity without a migration |

## Open Questions & Future Decisions

### Resolved
1. ✅ `payload_json` has a fixed schema (`AuditPayload` above).
2. ✅ DB failure fails hard with rollback and a clear agent-facing error; no retry/degraded mode.

### Deferred
1. A finance-facing read/report/export view over `audit_log` — schema supports it; UI is
   out of MVP scope.
2. DB file location / backup strategy for a real deployment — `data/` for the MVP.
3. WAL/corruption recovery, append-only DB triggers, transaction isolation tuning — not
   needed for a single-user MVP (`better-sqlite3` is synchronous; writes serialize).

## References

- `docs/llds/booking.md` — sole caller of `createBooking`.
- `docs/high-level-design.md § Success Metrics` — the no-booking-without-audit invariant.
