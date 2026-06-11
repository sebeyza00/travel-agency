// AUTH — logout endpoint. @spec AUTH-API-006
import { NextResponse } from "next/server";
import { getAuthStore } from "@/lib/auth/db";
import { getSessionToken, clearSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const token = await getSessionToken();
  if (token) getAuthStore().deleteSession(token);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
