// AUTH — login endpoint. @spec AUTH-API-004, AUTH-API-005
import { NextResponse } from "next/server";
import { getAuthStore } from "@/lib/auth/db";
import { login } from "@/lib/auth/service";
import { setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const result = login(getAuthStore(), email, password);
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 401 });
  }
  await setSessionCookie(result.token, result.expiresAt);
  return NextResponse.json(result.agent);
}
