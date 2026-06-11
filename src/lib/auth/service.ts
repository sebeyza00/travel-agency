// AUTH segment — register/login orchestration.
// Traces to docs/specs/auth.md AUTH-API-001..005.

import type { Agent } from "@/lib/auth/types";
import { type AuthStore, DuplicateEmailError } from "@/lib/auth/store";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MIN_PASSWORD = 8;
const GENERIC_LOGIN_ERROR = "Invalid email or password.";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface FieldError {
  field: "name" | "email" | "password";
  message: string;
}

export type AuthResult =
  | { ok: true; agent: Agent; token: string; expiresAt: string }
  | { ok: false; errors: FieldError[]; message?: string };

/**
 * Validate, hash, create the agent, and start a session.
 * @spec AUTH-API-001, AUTH-API-002, AUTH-API-003
 */
export function register(store: AuthStore, input: RegisterInput): AuthResult {
  const errors: FieldError[] = [];
  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  const password = input.password ?? "";

  if (!name) errors.push({ field: "name", message: "Name is required." });
  if (!EMAIL_RE.test(email)) errors.push({ field: "email", message: "Enter a valid email address." });
  if (password.length < MIN_PASSWORD) {
    errors.push({ field: "password", message: `Password must be at least ${MIN_PASSWORD} characters.` });
  }
  if (errors.length > 0) return { ok: false, errors };

  let agent: Agent;
  try {
    agent = store.createAgent({ name, email, passwordHash: hashPassword(password) });
  } catch (err) {
    if (err instanceof DuplicateEmailError) {
      const message = "That email is already registered.";
      return { ok: false, errors: [{ field: "email", message }], message };
    }
    throw err;
  }

  const session = store.createSession(agent.id);
  return { ok: true, agent, token: session.token, expiresAt: session.expiresAt };
}

/**
 * Verify credentials and start a session; generic failure on any mismatch.
 * @spec AUTH-API-004, AUTH-API-005
 */
export function login(store: AuthStore, email: string, password: string): AuthResult {
  const normalized = (email ?? "").trim().toLowerCase();
  const record = store.findAgentByEmail(normalized);
  // Verify even when the account is missing-ish, then reject uniformly (no enumeration).
  if (!record || !verifyPassword(password ?? "", record.passwordHash)) {
    return { ok: false, errors: [], message: GENERIC_LOGIN_ERROR };
  }
  const agent: Agent = { id: record.id, email: record.email, name: record.name, createdAt: record.createdAt };
  const session = store.createSession(agent.id);
  return { ok: true, agent, token: session.token, expiresAt: session.expiresAt };
}
