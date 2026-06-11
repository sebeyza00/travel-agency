// Shared SQLite connection for the running app (auth + bookings/audit all use it).
// Tests open their own isolated stores; this singleton is for the app only.
import * as fs from "node:fs";
import * as path from "node:path";
import Database from "better-sqlite3";

let shared: Database.Database | null = null;

export function getSharedDb(): Database.Database {
  if (!shared) {
    const dbPath = path.join(process.cwd(), "data", "travel-agency.db");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    shared = new Database(dbPath);
    shared.pragma("journal_mode = WAL"); // concurrent readers; serialized writers
    shared.pragma("busy_timeout = 5000"); // retry briefly on write contention
    shared.pragma("foreign_keys = ON");
  }
  return shared;
}
