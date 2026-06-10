// SEARCH/FLIGHTS — search endpoint. Validates criteria and returns the complete option set.
// @spec FLIGHTS-API-001

import { NextResponse } from "next/server";
import { validateSearchCriteria } from "@/lib/search/criteria";
import { mockFlightProvider } from "@/lib/flights/mock-provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const result = validateSearchCriteria(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }
  const search = await mockFlightProvider.search(result.criteria);
  return NextResponse.json({ criteria: result.criteria, ...search });
}
