// BOOKING/AUDIT — booking endpoint. Persists the booking + audit row transactionally.
// @spec BOOKING-API-001

import { NextResponse } from "next/server";
import { getAuditStore } from "@/lib/audit/db";
import type { BookingInput } from "@/lib/booking/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = (await request.json()) as BookingInput;
  try {
    const saved = getAuditStore().createBooking(input);
    return NextResponse.json(saved, { status: 201 });
  } catch {
    // Fail hard: no partial rows persisted (transaction rolled back).
    return NextResponse.json({ error: "The booking could not be saved." }, { status: 500 });
  }
}
