// AUTH segment — server-side session cookie + current-agent accessor (node runtime).
import { cookies } from "next/headers";
import { getAuthStore } from "@/lib/auth/db";
import { SESSION_COOKIE } from "@/lib/auth/gate";
import type { Agent } from "@/lib/auth/types";

export { SESSION_COOKIE };

/** Authoritative session validation. @spec AUTH-API-007 */
export async function getCurrentAgent(): Promise<Agent | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getAuthStore().getSessionAgent(token);
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSessionCookie(token: string, expiresAt: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
