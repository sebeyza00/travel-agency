// AUTH segment — agents + sessions persistence.
// Traces to docs/llds/auth.md and docs/specs/auth.md.

import { randomBytes } from "node:crypto";
import Database from "better-sqlite3";
import type { Agent, AgentRecord, SessionInfo } from "@/lib/auth/types";

/** Thrown by createAgent when the email is already registered. */
export class DuplicateEmailError extends Error {
  constructor() {
    super("email already registered");
    this.name = "DuplicateEmailError";
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS agents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT    PRIMARY KEY,
  agent_id    INTEGER NOT NULL REFERENCES agents(id),
  created_at  TEXT    NOT NULL,
  expires_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
`;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface AgentRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === "SQLITE_CONSTRAINT_UNIQUE";
}

export interface AuthStore {
  /** Insert an agent. @spec AUTH-API-002, AUTH-API-003 — throws DuplicateEmailError on a taken email. */
  createAgent(input: { name: string; email: string; passwordHash: string }): Agent;
  /** Look up an agent (with hash) by normalized email. */
  findAgentByEmail(email: string): AgentRecord | null;
  /** Create a session for an agent. @spec AUTH-API-007 */
  createSession(agentId: number): SessionInfo;
  /** Resolve a session token to an agent, or null if missing/unknown/expired. @spec AUTH-API-007 */
  getSessionAgent(token: string): Agent | null;
  /** Delete a session (logout). @spec AUTH-API-006 */
  deleteSession(token: string): void;
  close(): void;
}

export interface OpenAuthStoreOptions {
  dbPath?: string;
  /** Use an existing shared connection (app); when omitted a connection is opened. */
  db?: Database.Database;
  now?: () => Date;
  /** Session lifetime; defaults to 7 days. */
  sessionTtlMs?: number;
  /** Injectable token generator (tests). */
  generateToken?: () => string;
}

/** Open (and idempotently migrate) an auth store. */
export function openAuthStore(options: OpenAuthStoreOptions = {}): AuthStore {
  const db = options.db ?? new Database(options.dbPath ?? ":memory:");
  const ownsDb = !options.db;
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  const now = options.now ?? (() => new Date());
  const ttl = options.sessionTtlMs ?? SEVEN_DAYS_MS;
  const genToken = options.generateToken ?? (() => randomBytes(32).toString("hex"));

  const toAgent = (r: AgentRow): Agent => ({ id: r.id, email: r.email, name: r.name, createdAt: r.created_at });

  return {
    createAgent({ name, email, passwordHash }) {
      const createdAt = now().toISOString();
      try {
        const info = db
          .prepare("INSERT INTO agents (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)")
          .run(email, name, passwordHash, createdAt);
        return { id: Number(info.lastInsertRowid), email, name, createdAt };
      } catch (err) {
        if (isUniqueViolation(err)) throw new DuplicateEmailError();
        throw err;
      }
    },

    findAgentByEmail(email) {
      const row = db.prepare("SELECT * FROM agents WHERE email = ?").get(email) as AgentRow | undefined;
      return row ? { ...toAgent(row), passwordHash: row.password_hash } : null;
    },

    createSession(agentId) {
      const token = genToken();
      const created = now();
      const expiresAt = new Date(created.getTime() + ttl).toISOString();
      db.prepare("INSERT INTO sessions (token, agent_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
        token,
        agentId,
        created.toISOString(),
        expiresAt,
      );
      return { token, expiresAt };
    },

    getSessionAgent(token) {
      if (!token) return null;
      const row = db
        .prepare(
          `SELECT a.*, s.expires_at AS s_expires_at FROM sessions s
           JOIN agents a ON a.id = s.agent_id WHERE s.token = ?`,
        )
        .get(token) as (AgentRow & { s_expires_at: string }) | undefined;
      if (!row) return null;
      if (Date.parse(row.s_expires_at) <= now().getTime()) return null; // expired
      return toAgent(row);
    },

    deleteSession(token) {
      db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    },

    close() {
      if (ownsDb) db.close();
    },
  };
}
