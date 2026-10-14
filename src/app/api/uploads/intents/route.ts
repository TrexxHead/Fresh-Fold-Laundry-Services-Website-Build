import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { productionReadiness } from "@/lib/runtime";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const purposeConfig = {
  STUDENT_ID: { bucket: "student-ids", maxBytes: 5_000_000 },
  PAYMENT_PROOF: { bucket: "payment-proofs", maxBytes: 8_000_000 },
  CARE_PHOTO: { bucket: "care-photos", maxBytes: 8_000_000 },
} as const;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

const intentSchema = z.object({
  reference: z.string().trim().min(8).max(40),
  accessToken: z.string().trim().min(20).max(200),
  purpose: z.enum(["STUDENT_ID", "PAYMENT_PROOF", "CARE_PHOTO"]),
  fileName: z.string().trim().min(1).max(120),
  mimeType: z.string().trim().max(80),
  sizeBytes: z.number().int().positive(),
});

function extensionFor(mimeType: string) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" } as Record<string, string>)[mimeType];
}

export async function POST(request: Request) {
  const readiness = productionReadiness();
  if (!readiness.ready || !readiness.integrations.uploadScanning) {
    return NextResponse.json({ ok: false, message: "Private uploads are not available until secure storage and scanning are configured." }, { status: 503 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid upload request." }, { status: 400 }); }
  const parsed = intentSchema.safeParse(body);
  if (!parsed.success || !allowedMimeTypes.has(parsed.data?.mimeType ?? "")) {
    return NextResponse.json({ ok: false, message: "Use a supported image or PDF within the stated size limit." }, { status: 400 });
  }
  const config = purposeConfig[parsed.data.purpose];
  if (parsed.data.sizeBytes > config.maxBytes) return NextResponse.json({ ok: false, message: "The file is larger than the allowed limit." }, { status: 413 });

  const supabase = createSupabaseServiceClient();
  const tokenHash = createHash("sha256").update(parsed.data.accessToken).digest("hex");
  const { data: order, error: accessError } = await supabase.rpc("get_guest_order", { p_reference: parsed.data.reference, p_guest_token_hash: tokenHash });
  const orderId = order && typeof order === "object" && "id" in order ? String(order.id) : "";
  if (accessError || !orderId) return NextResponse.json({ ok: false, message: "The private order link is invalid or expired." }, { status: 404 });
  const { data: allowed, error: rateError } = await supabase.rpc("consume_rate_limit", { p_bucket_key: `upload-intent:${tokenHash}`, p_limit: 10, p_window_seconds: 3600 });
  if (rateError || allowed !== true) return NextResponse.json({ ok: false, message: "Too many upload attempts. Wait before trying again." }, { status: 429 });

  const extension = extensionFor(parsed.data.mimeType);
  const objectPath = `${orderId}/${crypto.randomUUID()}.${extension}`;
  const { data: signed, error: signedError } = await supabase.storage.from(config.bucket).createSignedUploadUrl(objectPath, { upsert: false });
  if (signedError || !signed) return NextResponse.json({ ok: false, message: "The secure upload could not be prepared." }, { status: 503 });
  const { error: recordError } = await supabase.from("order_uploads").insert({
    order_id: orderId,
    upload_type: parsed.data.purpose,
    object_path: objectPath,
    mime_type: parsed.data.mimeType,
    size_bytes: parsed.data.sizeBytes,
    scan_status: "PENDING",
  });
  if (recordError) return NextResponse.json({ ok: false, message: "The secure upload could not be recorded." }, { status: 503 });

  return NextResponse.json({
    ok: true,
    upload: { bucket: config.bucket, path: objectPath, token: signed.token, maximumBytes: config.maxBytes, scanStatus: "PENDING" },
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
