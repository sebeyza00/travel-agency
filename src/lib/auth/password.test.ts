import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("stores a salted hash and verifies correct vs incorrect", () => {
    // @spec AUTH-PWD-001
    const stored = hashPassword("correct horse battery staple");
    expect(stored).not.toContain("correct horse battery staple"); // not plaintext
    expect(verifyPassword("correct horse battery staple", stored)).toBe(true);
    expect(verifyPassword("wrong password", stored)).toBe(false);
    expect(verifyPassword("correct horse battery staple", "garbage")).toBe(false); // malformed
  });

  it("uses a random salt so the same password hashes differently", () => {
    // @spec AUTH-PWD-002
    const a = hashPassword("hunter2hunter2");
    const b = hashPassword("hunter2hunter2");
    expect(a).not.toBe(b);
    expect(verifyPassword("hunter2hunter2", a)).toBe(true);
    expect(verifyPassword("hunter2hunter2", b)).toBe(true);
  });
});
