import { z } from "zod";
import { createSupabaseServiceClient } from "../supabase/service";
import type { BookingRepository, CreateBookingCommand } from "./booking-service";

const resultSchema = z.object({ order_id: z.string().uuid() });

function slotStart(slot: string): string {
  const mapping: Record<string, string> = {
    "10:00–10:30 a.m.": "10:00:00",
    "11:00–11:30 a.m.": "11:00:00",
    "12:00–12:30 p.m.": "12:00:00",
    "1:00–1:30 p.m.": "13:00:00",
    "2:00–2:30 p.m.": "14:00:00",
    "8:00–8:30 p.m.": "20:00:00",
    "9:00–9:30 p.m.": "21:00:00",
    "10:00–10:30 p.m.": "22:00:00",
  };
  const value = mapping[slot];
  if (!value) throw new Error("Unsupported pickup window.");
  return value;
}

export class SupabaseBookingRepository implements BookingRepository {
  async create(command: CreateBookingCommand): Promise<{ orderId: string }> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.rpc("create_booking_request", {
      p_payload: command.draft,
      p_idempotency_key: command.idempotencyKey,
      p_reference: command.reference,
      p_guest_token_hash: command.guestTokenHash,
      p_guest_token_expires_at: command.guestTokenExpiresAt,
      p_pickup_starts_at: slotStart(command.draft.pickupSlot),
      p_estimate: command.estimate,
      p_initial_status: command.initialStatus,
    });
    if (error) throw new Error("The booking could not be stored.", { cause: error });
    const parsed = resultSchema.parse(data);
    return { orderId: parsed.order_id };
  }
}
