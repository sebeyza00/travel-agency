import { describe, it, expect } from "vitest";
import { openAuthStore } from "@/lib/auth/store";
import { register, login } from "@/lib/auth/service";

const valid = { name: "Sam Rivera", email: "Sam@Example.com", password: "supersecret" };

describe("register", () => {
  it("rejects missing name, bad email, or a short password", () => {
    // @spec AUTH-API-001
    const store = openAuthStore();
    expect(register(store, { ...valid, name: "" }).ok).toBe(false);
    expect(register(store, { ...valid, email: "not-an-email" }).ok).toBe(false);
    expect(register(store, { ...valid, password: "short" }).ok).toBe(false);
    store.close();
  });

  it("creates an account with a normalized email and a session, hiding the hash", () => {
    // @spec AUTH-API-003
    const store = openAuthStore();
    const result = register(store, valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.agent.email).toBe("sam@example.com"); // normalized lowercase
      expect((result.agent as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
      expect(result.token).toBeTruthy();
      expect(store.findAgentByEmail("sam@example.com")).not.toBeNull();
    }
    store.close();
  });

  it("rejects a duplicate email with an 'already registered' message", () => {
    // @spec AUTH-API-002
    const store = openAuthStore();
    register(store, valid);
    const again = register(store, { ...valid, email: "sam@example.com" });
    expect(again.ok).toBe(false);
    if (!again.ok) expect((again.message ?? "") + JSON.stringify(again.errors)).toMatch(/already registered/i);
    store.close();
  });
});

describe("login", () => {
  it("starts a session on correct credentials", () => {
    // @spec AUTH-API-004
    const store = openAuthStore();
    register(store, valid);
    const result = login(store, "sam@example.com", "supersecret");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.agent.email).toBe("sam@example.com");
      expect(store.getSessionAgent(result.token)?.email).toBe("sam@example.com");
    }
    store.close();
  });

  it("rejects unknown email and wrong password with the same generic message", () => {
    // @spec AUTH-API-005
    const store = openAuthStore();
    register(store, valid);
    const unknown = login(store, "nobody@example.com", "supersecret");
    const wrong = login(store, "sam@example.com", "wrongpassword");
    expect(unknown.ok).toBe(false);
    expect(wrong.ok).toBe(false);
    if (!unknown.ok && !wrong.ok) {
      expect(unknown.message).toMatch(/invalid email or password/i);
      expect(unknown.message).toBe(wrong.message); // identical — no enumeration
    }
    store.close();
  });
});
