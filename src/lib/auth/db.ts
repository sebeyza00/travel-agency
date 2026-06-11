// Process-wide singleton auth store on the shared app connection.
import { openAuthStore, type AuthStore } from "@/lib/auth/store";
import { getSharedDb } from "@/lib/db/connection";

let store: AuthStore | null = null;

export function getAuthStore(): AuthStore {
  if (!store) store = openAuthStore({ db: getSharedDb() });
  return store;
}
