import { describe, it, expect, afterEach } from "vitest";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import Database from "better-sqlite3";
import { openAuditStore, type AuditStore } from "@/lib/audit/store";
import { makeBookingInput } from "@/test/fixtures";

const FIXED_NOW = () => new Date("2026-06-09T12:00:00.000Z");

/** A reference generator that yields a fixed sequence, then repeats the last. */
function refSeq(...refs: string[]) {
  let i = 0;
  return () => refs[Math.min(i++, refs.length - 1)];
}

const open = (overrides: Parameters<typeof openAuditStore>[0] = {}) =>
  openAuditStore({ now: FIXED_NOW, generateReference: refSeq("ABC234"), ...overrides });

const tempFiles: string[] = [];
function tempDbPath() {
  const p = path.join(os.tmpdir(), `lid-audit-${process.pid}-${tempFiles.length}-${Date.now()}.db`);
  tempFiles.push(p);
  return p;
}
afterEach(() => {
  for (const f of tempFiles.splice(0)) {
    try {
      fs.unlinkSync(f);
    } catch {
      /* ignore */
    }
  }
});

describe("AuditStore.createBooking", () => {
  it("writes a booking row and exactly one audit_log row for it", () => {
    // @spec AUDIT-API-001, AUDIT-API-002, BOOKING-API-001
    const store = open();
    const saved = store.createBooking(makeBookingInput());
    expect(saved.reference).toBe("ABC234");
    expect(saved.id).toBeGreaterThan(0);
    expect(saved.status).toBe("confirmed");
    expect(store.listBookings()).toHaveLength(1);
    const log = store.listAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].eventType).toBe("booking_created");
    expect(log[0].bookingReference).toBe("ABC234");
    expect(log[0].bookingId).toBe(saved.id);
    store.close();
  });

  it("records the actor as internal-agent", () => {
    // @spec AUDIT-API-005
    const store = open();
    store.createBooking(makeBookingInput());
    expect(store.listAuditLog()[0].actor).toBe("internal-agent");
    store.close();
  });

  it("stores a finance payload conforming to the AuditPayload shape", () => {
    // @spec AUDIT-API-003
    const store = open();
    const saved = store.createBooking(makeBookingInput());
    const payload = store.listAuditLog()[0].payload;
    expect(payload.reference).toBe("ABC234");
    expect(payload.route).toEqual({ origin: "JFK", destination: "LAX" });
    expect(payload.total).toBe(saved.totalPrice);
    expect(payload.currency).toBe("USD");
    expect(payload.occurredAt).toBe(saved.createdAt);
    store.close();
  });

  it("persists full JSON snapshots of criteria, option, and passengers", () => {
    // @spec BOOKING-API-004
    const store = open();
    const input = makeBookingInput();
    const saved = store.createBooking(input);
    expect(saved.criteria).toEqual(input.criteria);
    expect(saved.option).toEqual(input.option);
    expect(saved.passengers).toEqual(input.passengers);
    expect(saved.totalPrice).toBe(input.option.price.total);
    expect(saved.cabinClass).toBe(input.option.cabinClass);
    // Round-trips through the DB unchanged.
    expect(store.getBookingByReference("ABC234")).toEqual(saved);
    store.close();
  });

  it("exposes no update or delete operation on the audit log, and the log only grows", () => {
    // @spec AUDIT-API-004
    const store = open({ generateReference: refSeq("REF001", "REF002") });
    const s = store as unknown as Record<string, unknown>;
    expect(s.updateAuditLog).toBeUndefined();
    expect(s.deleteAuditLog).toBeUndefined();
    store.createBooking(makeBookingInput());
    expect(store.listAuditLog()).toHaveLength(1);
    store.createBooking(makeBookingInput());
    expect(store.listAuditLog()).toHaveLength(2);
    store.close();
  });

  it("persists the customer email and keeps it out of the audit payload", () => {
    // @spec AUDIT-API-007
    const store = open();
    const saved = store.createBooking(makeBookingInput({ customerEmail: "cust@example.com" }));
    expect(saved.customerEmail).toBe("cust@example.com");
    expect(store.getBookingByReference("ABC234")?.customerEmail).toBe("cust@example.com");
    const payload = store.listAuditLog()[0].payload as unknown as Record<string, unknown>;
    expect(payload.customerEmail).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain("cust@example.com");
    store.close();
  });

  it("stores a null customer email when none is provided", () => {
    // @spec AUDIT-API-007
    const store = open();
    const saved = store.createBooking(makeBookingInput({ customerEmail: null }));
    expect(saved.customerEmail).toBeNull();
    store.close();
  });

  it("retries on reference collision and, when exhausted, fails without writing a partial row", () => {
    // @spec BOOKING-API-003, AUDIT-API-006
    const store = open({ generateReference: refSeq("DUP999") }); // always collides after the first
    store.createBooking(makeBookingInput());
    expect(store.listBookings()).toHaveLength(1);
    expect(() => store.createBooking(makeBookingInput())).toThrow();
    // Rolled back: no partial booking or audit row from the failed attempt.
    expect(store.listBookings()).toHaveLength(1);
    expect(store.listAuditLog()).toHaveLength(1);
    store.close();
  });
});

describe("AuditStore schema", () => {
  it("creates its schema idempotently and persists across reopen", () => {
    // @spec AUDIT-DATA-001
    const dbPath = tempDbPath();
    const s1 = openAuditStore({ dbPath, now: FIXED_NOW, generateReference: refSeq("PERS01") });
    const saved = s1.createBooking(makeBookingInput());
    s1.close();

    // Reopening must not error on re-running schema creation, and data survives.
    const s2 = openAuditStore({ dbPath });
    expect(s2.getBookingByReference("PERS01")?.reference).toBe(saved.reference);
    s2.close();
  });

  it("adds the customer_email column to a legacy database that predates it", () => {
    // @spec AUDIT-DATA-002
    const dbPath = tempDbPath();
    // Create a legacy bookings table WITHOUT customer_email.
    const legacy = new Database(dbPath);
    legacy.exec(`
      CREATE TABLE bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, reference TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL, origin TEXT NOT NULL, destination TEXT NOT NULL,
        depart_date TEXT NOT NULL, return_date TEXT, cabin_class TEXT NOT NULL,
        passengers_count INTEGER NOT NULL, total_price REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD', status TEXT NOT NULL DEFAULT 'confirmed',
        criteria_json TEXT NOT NULL, option_json TEXT NOT NULL, passengers_json TEXT NOT NULL
      );
      CREATE TABLE audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL,
        booking_reference TEXT NOT NULL, event_type TEXT NOT NULL, occurred_at TEXT NOT NULL,
        actor TEXT NOT NULL DEFAULT 'internal-agent', amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD', payload_json TEXT NOT NULL
      );
    `);
    legacy.close();

    // Opening must migrate the column in, and a booking with an email must persist.
    const store = openAuditStore({ dbPath, now: FIXED_NOW, generateReference: refSeq("MIG001") });
    const saved = store.createBooking(makeBookingInput({ customerEmail: "legacy@example.com" }));
    expect(saved.customerEmail).toBe("legacy@example.com");
    expect(store.getBookingByReference("MIG001")?.customerEmail).toBe("legacy@example.com");
    store.close();
  });
});
