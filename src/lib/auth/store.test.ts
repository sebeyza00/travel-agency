import { describe, it, expect } from "vitest";
import { openAuthStore, DuplicateEmailError } from "@/lib/auth/store";

/** Controllable clock so session expiry is testable. */
function clock(startMs: number) {
  let t = startMs;
  return { now: () => new Date(t), advance: (ms: number) => { t += ms; } };
}

const agentInput = { name: "Sam Rivera", email: "sam@example.com", passwordHash: "salt:hash" };

describe("AuthStore agents", () => {
  it("creates an agent (without exposing the hash) and finds it by email", () => {
    // @spec AUTH-API-003
    const store = openAuthStore();
    const agent = store.createAgent(agentInput);
    expect(agent.email).toBe("sam@example.com");
    expect(agent.name).toBe("Sam Rivera");
    expect((agent as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    const record = store.findAgentByEmail("sam@example.com");
    expect(record?.passwordHash).toBe("salt:hash");
    store.close();
  });

  it("rejects a duplicate email", () => {
    // @spec AUTH-API-002
    const store = openAuthStore();
    store.createAgent(agentInput);
    expect(() => store.createAgent({ ...agentInput, name: "Other" })).toThrow(DuplicateEmailError);
    store.close();
  });
});

describe("AuthStore sessions", () => {
  it("resolves a valid token, and rejects missing/unknown/expired tokens", () => {
    // @spec AUTH-API-007
    const c = clock(1_000_000);
    let n = 0;
    const store = openAuthStore({ now: c.now, sessionTtlMs: 10_000, generateToken: () => `tok${n++}` });
    const agent = store.createAgent(agentInput);
    const session = store.createSession(agent.id);

    expect(store.getSessionAgent(session.token)?.email).toBe("sam@example.com"); // valid
    expect(store.getSessionAgent("nope")).toBeNull(); // unknown
    expect(store.getSessionAgent("")).toBeNull(); // missing

    c.advance(10_001); // past TTL
    expect(store.getSessionAgent(session.token)).toBeNull(); // expired
    store.close();
  });

  it("deletes a session on logout", () => {
    // @spec AUTH-API-006
    const store = openAuthStore();
    const agent = store.createAgent(agentInput);
    const session = store.createSession(agent.id);
    expect(store.getSessionAgent(session.token)).not.toBeNull();
    store.deleteSession(session.token);
    expect(store.getSessionAgent(session.token)).toBeNull();
    store.close();
  });
});
