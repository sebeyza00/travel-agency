// Process-wide singleton audit store for the running app (file-backed).
import * as path from "node:path";
import { openAuditStore, type AuditStore } from "@/lib/audit/store";

let store: AuditStore | null = null;

export function getAuditStore(): AuditStore {
  if (!store) {
    store = openAuditStore({ dbPath: path.join(process.cwd(), "data", "travel-agency.db") });
  }
  return store;
}
