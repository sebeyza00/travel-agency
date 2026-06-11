// Edge middleware — coarse, DB-free session-cookie gate (see docs/llds/auth.md).
// @spec AUTH-NAV-001
import { NextResponse, type NextRequest } from "next/server";
import { gateDecision, SESSION_COOKIE } from "@/lib/auth/gate";

export function middleware(req: NextRequest) {
  const hasCookie = req.cookies.has(SESSION_COOKIE);
  const decision = gateDecision(req.nextUrl.pathname, hasCookie);
  if (decision === "allow") return NextResponse.next();
  if (decision === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
