// BOOKING/AUDIT/EMAIL — booking endpoint. Persists transactionally, then best-effort emails.
// @spec BOOKING-API-001, BOOKING-API-005, BOOKING-API-006

import { NextResponse } from "next/server";
import { getAuditStore } from "@/lib/audit/db";
import { getEmailSender } from "@/lib/email/sender";
import { confirmBooking } from "@/lib/booking/service";
import { getCurrentAgent } from "@/lib/auth/session";
import type { BookingInput } from "@/lib/booking/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // @spec AUTH-API-008 — attribution comes from the session, never the client body.
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const input = (await request.json()) as BookingInput;
  try {
    // confirmBooking persists first, then sends best-effort; a send failure does not throw.
    const result = await confirmBooking(getAuditStore(), getEmailSender(), input, agent.email);
    return NextResponse.json(result, { status: 201 });
  } catch {
    // Only reached when the booking itself failed to persist (rolled back).
    return NextResponse.json({ error: "The booking could not be saved." }, { status: 500 });
  }
}
