import { createHash, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { productionReadiness } from "@/lib/runtime";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const base = z.object({
  reference: z.string().trim().min(8).max(40),
  accessToken: z.string().trim().min(20).max(200),
});

const actionSchema = z.discriminatedUnion("action", [
  base.extend({ action: z.literal("PRICE_DECISION"), payload: z.object({ decision: z.enum(["APPROVED", "REJECTED"]) }) }),
  base.extend({ action: z.literal("RESCHEDULE"), payload: z.object({ pickupDate: z.iso.date(), pickupSlot: z.string().min(3).max(80), note: z.string().trim().max(500).default("") }) }),
  base.extend({ action: z.literal("SUPPORT"), payload: z.object({ note: z.string().trim().min(10).max(1000) }) }),
]);

function genericFailure(status = 400) {
  return NextResponse.json({ ok: false, message: "This action could not be completed. Reopen the private order link and try again." }, { status });
}

export async function POST(request: Request) {
  const readiness = productionReadiness();
  if (!readiness.ready) return NextResponse.json({ ok: false, message: "Secure order actions are not configured yet." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch { return genericFailure(); }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return genericFailure();

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limiterSecret = process.env.BOOKING_RATE_LIMIT_SECRET || process.env.GUEST_LINK_SIGNING_SECRET as string;
  const bucketKey = `guest-action:${createHmac("sha256", limiterSecret).update(forwardedFor).digest("hex")}`;
  const supabase = createSupabaseServiceClient();
  const { data: allowed, error: rateError } = await supabase.rpc("consume_rate_limit", { p_bucket_key: bucketKey, p_limit: 12, p_window_seconds: 600 });
  if (rateError || allowed !== true) return NextResponse.json({ ok: false, message: "Too many attempts. Wait ten minutes before trying again." }, { status: 429 });

  const tokenHash = createHash("sha256").update(parsed.data.accessToken).digest("hex");
  const { error } = await supabase.rpc("create_guest_order_action", {
    p_reference: parsed.data.reference,
    p_guest_token_hash: tokenHash,
    p_action: parsed.data.action,
    p_payload: parsed.data.payload,
  });
  if (error) {
    console.error(JSON.stringify({ level: "warn", event: "guest_order_action_rejected", action: parsed.data.action, requestId: crypto.randomUUID() }));
    return genericFailure(error.message.includes("INVALID_OR_EXPIRED") ? 404 : 409);
  }
  return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
