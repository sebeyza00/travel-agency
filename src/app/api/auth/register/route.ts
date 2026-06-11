// AUTH — registration endpoint. @spec AUTH-API-001, AUTH-API-002, AUTH-API-003
import { NextResponse } from "next/server";
import { getAuthStore } from "@/lib/auth/db";
import { register } from "@/lib/auth/service";
import { setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const result = register(getAuthStore(), body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors, message: result.message }, { status: 400 });
  }
  await setSessionCookie(result.token, result.expiresAt);
  return NextResponse.json(result.agent, { status: 201 });
}
