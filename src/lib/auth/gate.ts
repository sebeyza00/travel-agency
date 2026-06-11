// AUTH segment — route-gating decision logic (used by middleware).
// Traces to docs/specs/auth.md AUTH-NAV-001, AUTH-API-008.

export type GateAction = "allow" | "redirect-login" | "unauthorized";

/** Session cookie name. Lives here (pure module) so edge middleware can import it. */
export const SESSION_COOKIE = "fd_session";

/** Paths reachable without a session. */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/")
  );
}

/**
 * Decide what to do with a request given its path and whether a session cookie
 * is present. Public paths are always allowed; otherwise an absent cookie
 * redirects pages to login and answers API paths with 401.
 * @spec AUTH-NAV-001, AUTH-API-008
 */
export function gateDecision(pathname: string, hasSessionCookie: boolean): GateAction {
  if (isPublicPath(pathname)) return "allow";
  if (!hasSessionCookie) return pathname.startsWith("/api/") ? "unauthorized" : "redirect-login";
  return "allow"; // cookie present — the node layer performs authoritative validation
}
