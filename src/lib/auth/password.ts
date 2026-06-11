// AUTH segment — password hashing (scrypt via node:crypto).
// Traces to docs/specs/auth.md AUTH-PWD-001, AUTH-PWD-002.

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const SALT_BYTES = 16;

/** Hash a password as "saltHex:hashHex" with a random per-call salt. @spec AUTH-PWD-001, AUTH-PWD-002 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const key = scryptSync(password, salt, KEYLEN);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

/** Constant-time verify of a password against a stored "saltHex:hashHex". @spec AUTH-PWD-001 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [saltHex, hashHex] = stored.split(":");
    if (!saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, "hex");
    if (expected.length !== KEYLEN) return false;
    const actual = scryptSync(password, Buffer.from(saltHex, "hex"), KEYLEN);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
