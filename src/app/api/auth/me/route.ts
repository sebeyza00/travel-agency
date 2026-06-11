// AUTH — current agent. @spec AUTH-API-007
import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(agent);
}
