// AUDIT segment — SQLite persistence + append-only audit log.
// Traces to docs/llds/audit.md and docs/specs/audit.md.

import * as fs from "node:fs";
import * as path from "node:path";
import Database from "better-sqlite3";
import type { BookingInput, SavedBooking } from "@/lib/booking/types";
import { buildAuditPayload, type AuditPayload } from "@/lib/audit/payload";
import { generateReference as defaultGenerateReference } from "@/lib/booking/reference";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS bookings (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  reference        TEXT    NOT NULL UNIQUE,
  created_at       TEXT    NOT NULL,
  origin           TEXT    NOT NULL,
  destination      TEXT    NOT NULL,
  depart_date      TEXT    NOT NULL,
  return_date      TEXT,
  cabin_class      TEXT    NOT NULL,
  passengers_count INTEGER NOT NULL,
  total_price      REAL    NOT NULL,
  currency         TEXT    NOT NULL DEFAULT 'USD',
  status           TEXT    NOT NULL DEFAULT 'confirmed',
  criteria_json    TEXT    NOT NULL,
  option_json      TEXT    NOT NULL,
  passengers_json  TEXT    NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id        INTEGER NOT NULL REFERENCES bookings(id),
  booking_reference TEXT    NOT NULL,
  event_type        TEXT    NOT NULL,
  occurred_at       TEXT    NOT NULL,
  actor             TEXT    NOT NULL DEFAULT 'internal-agent',
  amount            REAL    NOT NULL,
  currency          TEXT    NOT NULL DEFAULT 'USD',
  payload_json      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_occurred_at ON audit_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(reference);
`;

const MAX_REFERENCE_ATTEMPTS = 5;

interface BookingRow {
  id: number;
  reference: string;
  created_at: string;
  cabin_class: string;
  total_price: number;
  currency: string;
  status: string;
  criteria_json: string;
  option_json: string;
  passengers_json: string;
}

interface AuditRow {
  id: number;
  booking_id: number;
  booking_reference: string;
  event_type: string;
  occurred_at: string;
  actor: string;
  amount: number;
  currency: string;
  payload_json: string;
}

function rowToBooking(row: BookingRow): SavedBooking {
  return {
    id: Number(row.id),
    reference: row.reference,
    createdAt: row.created_at,
    criteria: JSON.parse(row.criteria_json),
    option: JSON.parse(row.option_json),
    passengers: JSON.parse(row.passengers_json),
    totalPrice: row.total_price,
    currency: row.currency as "USD",
    cabinClass: row.cabin_class as SavedBooking["cabinClass"],
    status: row.status as SavedBooking["status"],
  };
}

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === "SQLITE_CONSTRAINT_UNIQUE" || code === "SQLITE_CONSTRAINT_PRIMARYKEY";
}

export interface AuditLogRow {
  id: number;
  bookingId: number;
  bookingReference: string;
  eventType: string;
  occurredAt: string;
  actor: string;
  amount: number;
  currency: string;
  payload: AuditPayload;
}

/**
 * The persistence boundary. Note: no update/delete operation against
 * audit_log is exposed — entries are append-only.
 * @spec AUDIT-API-004
 */
export interface AuditStore {
  /** @spec AUDIT-API-001, AUDIT-API-002, AUDIT-API-005, AUDIT-API-006, BOOKING-API-001, BOOKING-API-003 */
  createBooking(input: BookingInput): SavedBooking;
  getBookingByReference(reference: string): SavedBooking | null;
  listBookings(): SavedBooking[];
  listAuditLog(): AuditLogRow[];
  close(): void;
}

export interface OpenAuditStoreOptions {
  /** File path, or omit for an in-memory DB (tests). */
  dbPath?: string;
  /** Injectable reference generator (tests force collisions). */
  generateReference?: () => string;
  /** Injectable clock for deterministic timestamps. */
  now?: () => Date;
}

/**
 * Open (and idempotently migrate) an audit store.
 * @spec AUDIT-DATA-001, AUDIT-API-001, AUDIT-API-002, AUDIT-API-005,
 *       AUDIT-API-006, BOOKING-API-001, BOOKING-API-003
 */
export function openAuditStore(options: OpenAuditStoreOptions = {}): AuditStore {
  const dbPath = options.dbPath ?? ":memory:";
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA); // idempotent (CREATE ... IF NOT EXISTS)

  const generateReference = options.generateReference ?? defaultGenerateReference;
  const now = options.now ?? (() => new Date());

  const insertBooking = db.prepare(
    `INSERT INTO bookings
       (reference, created_at, origin, destination, depart_date, return_date,
        cabin_class, passengers_count, total_price, currency, status,
        criteria_json, option_json, passengers_json)
     VALUES
       (@reference, @created_at, @origin, @destination, @depart_date, @return_date,
        @cabin_class, @passengers_count, @total_price, @currency, @status,
        @criteria_json, @option_json, @passengers_json)`,
  );
  const insertAudit = db.prepare(
    `INSERT INTO audit_log
       (booking_id, booking_reference, event_type, occurred_at, actor, amount, currency, payload_json)
     VALUES
       (@booking_id, @booking_reference, @event_type, @occurred_at, @actor, @amount, @currency, @payload_json)`,
  );

  // One transaction: booking row + audit row together, or neither (AUDIT-API-001/006).
  const persist = db.transaction((reference: string, input: BookingInput, createdAt: string): SavedBooking => {
    const info = insertBooking.run({
      reference,
      created_at: createdAt,
      origin: input.criteria.origin,
      destination: input.criteria.destination,
      depart_date: input.criteria.departureDate,
      return_date: input.criteria.returnDate,
      cabin_class: input.option.cabinClass,
      passengers_count: input.passengers.length,
      total_price: input.option.price.total,
      currency: "USD",
      status: "confirmed",
      criteria_json: JSON.stringify(input.criteria),
      option_json: JSON.stringify(input.option),
      passengers_json: JSON.stringify(input.passengers),
    });
    const saved: SavedBooking = {
      id: Number(info.lastInsertRowid),
      reference,
      createdAt,
      criteria: input.criteria,
      option: input.option,
      passengers: input.passengers,
      totalPrice: input.option.price.total,
      currency: "USD",
      cabinClass: input.option.cabinClass,
      status: "confirmed",
    };
    const payload: AuditPayload = buildAuditPayload(saved);
    insertAudit.run({
      booking_id: saved.id,
      booking_reference: reference,
      event_type: "booking_created",
      occurred_at: createdAt,
      actor: "internal-agent",
      amount: saved.totalPrice,
      currency: "USD",
      payload_json: JSON.stringify(payload),
    });
    return saved;
  });

  return {
    createBooking(input: BookingInput): SavedBooking {
      const createdAt = now().toISOString();
      let lastErr: unknown;
      for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt++) {
        const reference = generateReference();
        try {
          return persist(reference, input, createdAt);
        } catch (err) {
          // Transaction already rolled back; retry on collision, else propagate.
          lastErr = err;
          if (!isUniqueViolation(err)) throw err;
        }
      }
      throw new Error(
        `Could not generate a unique booking reference after ${MAX_REFERENCE_ATTEMPTS} attempts`,
        { cause: lastErr },
      );
    },

    getBookingByReference(reference: string): SavedBooking | null {
      const row = db.prepare("SELECT * FROM bookings WHERE reference = ?").get(reference) as BookingRow | undefined;
      return row ? rowToBooking(row) : null;
    },

    listBookings(): SavedBooking[] {
      const rows = db.prepare("SELECT * FROM bookings ORDER BY id").all() as BookingRow[];
      return rows.map(rowToBooking);
    },

    listAuditLog(): AuditLogRow[] {
      const rows = db.prepare("SELECT * FROM audit_log ORDER BY id").all() as AuditRow[];
      return rows.map((r) => ({
        id: Number(r.id),
        bookingId: Number(r.booking_id),
        bookingReference: r.booking_reference,
        eventType: r.event_type,
        occurredAt: r.occurred_at,
        actor: r.actor,
        amount: r.amount,
        currency: r.currency,
        payload: JSON.parse(r.payload_json) as AuditPayload,
      }));
    },

    close(): void {
      db.close();
    },
  };
}
