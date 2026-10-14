import { createHash, randomBytes } from "node:crypto";
import { bookingSchema } from "../schemas";
import { calculateEstimate } from "../pricing";
import type { BookingDraft, Estimate, OrderStatus } from "../models";

export interface BookingSubmission {
  draft: BookingDraft;
  idempotencyKey: string;
}

export interface CreateBookingCommand {
  draft: BookingDraft;
  idempotencyKey: string;
  reference: string;
  estimate: Estimate;
  guestTokenHash: string;
  guestTokenExpiresAt: string;
  initialStatus: Extract<OrderStatus, "AWAITING_STUDENT_VERIFICATION" | "AWAITING_STAFF_CONFIRMATION">;
}

export interface BookingRepository {
  create(command: CreateBookingCommand): Promise<{ orderId: string }>;
}

export interface BookingReceipt {
  orderId: string;
  reference: string;
  accessToken: string;
  accessExpiresAt: string;
  status: CreateBookingCommand["initialStatus"];
  estimatedTotalJmd: number;
  provisional: boolean;
}

interface BookingDependencies {
  now: () => Date;
  guestToken: () => string;
  referenceSuffix: () => string;
}

const defaultDependencies: BookingDependencies = {
  now: () => new Date(),
  guestToken: () => randomBytes(32).toString("base64url"),
  referenceSuffix: () => randomBytes(3).toString("hex").slice(0, 3).toUpperCase(),
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function submitBooking(
  submission: BookingSubmission,
  repository: BookingRepository,
  dependencies: BookingDependencies = defaultDependencies,
): Promise<BookingReceipt> {
  const parsed = bookingSchema.safeParse(submission.draft);
  if (!parsed.success) {
    throw new Error("Booking validation failed.", { cause: parsed.error });
  }

  const now = dependencies.now();
  const estimate = calculateEstimate({
    customerCategory: parsed.data.customerCategory,
    studentVerified: false,
    serviceType: parsed.data.serviceType,
    loadSize: parsed.data.loadSize,
    items: [...parsed.data.ironingItems, ...parsed.data.specialItems],
  }, now.toISOString());
  const accessToken = dependencies.guestToken();
  const reference = `FF-${now.toISOString().slice(2, 10).replaceAll("-", "")}-${dependencies.referenceSuffix()}`;
  const accessExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const initialStatus = parsed.data.customerCategory === "STUDENT"
    ? "AWAITING_STUDENT_VERIFICATION"
    : "AWAITING_STAFF_CONFIRMATION";

  const stored = await repository.create({
    draft: parsed.data,
    idempotencyKey: submission.idempotencyKey,
    reference,
    estimate,
    guestTokenHash: sha256(accessToken),
    guestTokenExpiresAt: accessExpiresAt,
    initialStatus,
  });

  return {
    orderId: stored.orderId,
    reference,
    accessToken,
    accessExpiresAt,
    status: initialStatus,
    estimatedTotalJmd: estimate.knownTotalJmd,
    provisional: estimate.provisional,
  };
}
