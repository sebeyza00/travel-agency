// Process-wide singleton audit store on the shared app connection.
import { openAuditStore, type AuditStore } from "@/lib/audit/store";
import { getSharedDb } from "@/lib/db/connection";

let store: AuditStore | null = null;

export function getAuditStore(): AuditStore {
  if (!store) store = openAuditStore({ db: getSharedDb() });
  return store;
}
