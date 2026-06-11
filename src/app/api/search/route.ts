// SEARCH/FLIGHTS — search endpoint. Validates criteria and returns the complete option set.
// @spec FLIGHTS-API-001

import { NextResponse } from "next/server";
import { validateSearchCriteria } from "@/lib/search/criteria";
import { mockFlightProvider } from "@/lib/flights/mock-provider";
import { getCurrentAgent } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // @spec AUTH-API-008
  if (!(await getCurrentAgent())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const result = validateSearchCriteria(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }
  const search = await mockFlightProvider.search(result.criteria);
  return NextResponse.json({ criteria: result.criteria, ...search });
}
