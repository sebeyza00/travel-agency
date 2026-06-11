// AUTH segment — agent/session shapes.
// Traces to docs/llds/auth.md.

/** In-app agent shape — never carries the password hash. */
export interface Agent {
  id: number;
  email: string; // normalized lowercase
  name: string;
  createdAt: string;
}

/** Internal agent record including the stored password hash. */
export interface AgentRecord extends Agent {
  passwordHash: string; // "saltHex:hashHex"
}

export interface SessionInfo {
  token: string;
  expiresAt: string; // ISO-8601
}
