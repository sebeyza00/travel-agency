# AUDIT — EARS Specs

Traces to `docs/llds/audit.md`. Segment prefix: `AUDIT`.

## Schema & persistence

- [x] **AUDIT-DATA-001**: On server startup, the system shall idempotently ensure the `bookings` and `audit_log` tables (and their indexes) exist in the SQLite database.
- [x] **AUDIT-DATA-002**: On server startup, the system shall idempotently add the nullable `customer_email` column to the `bookings` table when it is absent, so a database created by an earlier version gains the column without data loss.
- [x] **AUDIT-API-001**: When persisting a booking, the AUDIT store shall write the `bookings` row and its `audit_log` row within a single transaction.
- [x] **AUDIT-API-002**: When a booking is persisted successfully, the system shall produce exactly one `audit_log` row with `event_type` "booking_created" referencing that booking (no booking exists without a corresponding audit row).
- [x] **AUDIT-API-003**: When writing an `audit_log` row, the system shall populate `payload_json` conforming to the `AuditPayload` schema (reference, route, dates, cabin class, passenger count, price breakdown, total, currency, occurredAt).
- [x] **AUDIT-API-004**: The AUDIT store shall expose no update or delete operation against `audit_log` — entries are append-only (inserts only).
- [x] **AUDIT-API-005**: When writing an `audit_log` row, the system shall set `actor` to "internal-agent" (the single trusted internal user; no authentication in scope).
- [x] **AUDIT-API-007**: When persisting a booking, the system shall store the optional customer email (or null when none was provided) on the `bookings` row, and shall not include it in the `audit_log` payload.

## Failure behavior

- [x] **AUDIT-API-006**: If any write within the booking transaction fails, then the system shall roll back the transaction so that no partial `bookings` or `audit_log` row persists, and shall propagate the error to the caller.
