import { createHmac } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getRuntimeMode, productionReadiness } from "@/lib/runtime";
import { bookingSchema } from "@/lib/schemas";
import { submitBooking } from "@/lib/server/booking-service";
import { SupabaseBookingRepository } from "@/lib/server/supabase-booking-repository";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const requestSchema = z.object({
  draft: bookingSchema,
  idempotencyKey: z.uuid(),
});

function safeError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export async function POST(request: Request) {
  if (getRuntimeMode() !== "production") {
    return safeError(409, "REVIEW_MODE", "This owner-review build stores clearly labelled demo requests in the current browser.");
  }
  const readiness = productionReadiness();
  if (!readiness.ready) {
    return safeError(503, "SERVICE_NOT_CONFIGURED", "Online booking is temporarily unavailable while secure production services are configured.");
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limiterSecret = process.env.BOOKING_RATE_LIMIT_SECRET || process.env.GUEST_LINK_SIGNING_SECRET as string;
  const bucketKey = `booking:${createHmac("sha256", limiterSecret).update(forwardedFor).digest("hex")}`;
  const supabase = createSupabaseServiceClient();
  const { data: allowed, error: rateError } = await supabase.rpc("consume_rate_limit", { p_bucket_key: bucketKey, p_limit: 8, p_window_seconds: 900 });
  if (rateError || allowed !== true) return safeError(429, "RATE_LIMITED", "Too many booking attempts. Wait fifteen minutes before trying again.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return safeError(400, "INVALID_JSON", "The request could not be read.");
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Check the highlighted booking details.",
      fields: parsed.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  try {
    const receipt = await submitBooking(parsed.data, new SupabaseBookingRepository());
    return NextResponse.json({ ok: true, receipt }, { status: 201 });
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error(JSON.stringify({
      level: "error",
      event: "booking_submission_failed",
      requestId,
      message: error instanceof Error ? error.message : "Unknown error",
    }));
    return safeError(503, "BOOKING_UNAVAILABLE", `We could not save this request. Try again and quote support reference ${requestId.slice(0, 8)} if it continues.`);
  }
}
