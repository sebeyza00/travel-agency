import { describe, it, expect } from "vitest";
import { isPublicPath, gateDecision } from "@/lib/auth/gate";

describe("isPublicPath", () => {
  it("treats auth pages, auth endpoints, and static assets as public", () => {
    // @spec AUTH-NAV-001
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/register")).toBe(true);
    expect(isPublicPath("/api/auth/login")).toBe(true);
    expect(isPublicPath("/api/auth/register")).toBe(true);
    expect(isPublicPath("/_next/static/chunk.js")).toBe(true);
    expect(isPublicPath("/favicon.ico")).toBe(true);
  });

  it("treats the app and its data endpoints as protected", () => {
    // @spec AUTH-NAV-001
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/api/search")).toBe(false);
    expect(isPublicPath("/api/bookings")).toBe(false);
  });
});

describe("gateDecision", () => {
  it("allows public paths regardless of cookie", () => {
    // @spec AUTH-NAV-001
    expect(gateDecision("/login", false)).toBe("allow");
    expect(gateDecision("/api/auth/login", false)).toBe("allow");
  });

  it("redirects protected pages and 401s protected APIs when no cookie is present", () => {
    // @spec AUTH-NAV-001, AUTH-API-008
    expect(gateDecision("/", false)).toBe("redirect-login");
    expect(gateDecision("/api/search", false)).toBe("unauthorized");
    expect(gateDecision("/api/bookings", false)).toBe("unauthorized");
  });

  it("allows protected paths through when a cookie is present (node layer validates)", () => {
    // @spec AUTH-NAV-001
    expect(gateDecision("/", true)).toBe("allow");
    expect(gateDecision("/api/bookings", true)).toBe("allow");
  });
});
