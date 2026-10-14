import { createHash, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_STATUSES, type CustomerOrderView } from "@/lib/models";
import { productionReadiness } from "@/lib/runtime";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const lookupSchema = z.object({
  reference: z.string().trim().min(8).max(40),
  accessToken: z.string().trim().min(20).max(200),
});

const orderShape = z.object({
  id: z.string(),
  reference: z.string(),
  customerName: z.string(),
  location: z.string(),
  pickupDate: z.string(),
  pickupSlot: z.string(),
  status: z.enum(ORDER_STATUSES),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  estimate: z.object({ knownTotalJmd: z.number() }).passthrough(),
  history: z.array(z.unknown()),
  communications: z.array(z.unknown()),
  changeRequests: z.array(z.unknown()),
  operationEvents: z.array(z.unknown()),
}).passthrough();

function genericNotFound() {
  return NextResponse.json({ ok: false, message: "The reference or private access code is invalid or expired." }, { status: 404 });
}

export async function POST(request: Request) {
  const readiness = productionReadiness();
  if (!readiness.ready) return NextResponse.json({ ok: false, message: "Secure order lookup is not configured yet." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return genericNotFound(); }
  const parsed = lookupSchema.safeParse(body);
  if (!parsed.success) return genericNotFound();

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limiterSecret = process.env.BOOKING_RATE_LIMIT_SECRET || process.env.GUEST_LINK_SIGNING_SECRET as string;
  const bucketKey = `guest-lookup:${createHmac("sha256", limiterSecret).update(forwardedFor).digest("hex")}`;
  const supabase = createSupabaseServiceClient();
  const { data: allowed, error: rateError } = await supabase.rpc("consume_rate_limit", { p_bucket_key: bucketKey, p_limit: 10, p_window_seconds: 600 });
  if (rateError || allowed !== true) return NextResponse.json({ ok: false, message: "Too many attempts. Wait ten minutes before trying again." }, { status: 429 });

  const tokenHash = createHash("sha256").update(parsed.data.accessToken).digest("hex");
  const { data, error } = await supabase.rpc("get_guest_order", { p_reference: parsed.data.reference, p_guest_token_hash: tokenHash });
  if (error || !data) return genericNotFound();
  const safe = orderShape.safeParse(data);
  if (!safe.success) {
    console.error(JSON.stringify({ level: "error", event: "guest_order_dto_invalid", requestId: crypto.randomUUID() }));
    return NextResponse.json({ ok: false, message: "The order is temporarily unavailable." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, order: safe.data as unknown as CustomerOrderView }, { headers: { "Cache-Control": "no-store" } });
}
