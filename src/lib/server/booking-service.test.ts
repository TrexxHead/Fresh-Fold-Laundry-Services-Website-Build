import { describe, expect, it, vi } from "vitest";
import type { BookingDraft } from "../models";
import { submitBooking, type BookingRepository, type CreateBookingCommand } from "./booking-service";

const validDraft: BookingDraft = {
  fullName: "Alicia Brown",
  phone: "876-555-6339",
  email: "alicia@example.com",
  bookAs: "GUEST",
  customerCategory: "NON_STUDENT",
  addressType: "CAMPUS",
  campusOrBuilding: "UWI Mona",
  addressLine: "Taylor Hall, UWI Mona",
  community: "Mona",
  pickupDate: "2026-10-14",
  pickupSlot: "11:00–11:30 a.m.",
  serviceType: "WASH_FOLD",
  loadSize: 6,
  ironingItems: [],
  specialItems: [],
  preferences: ["Cold-water wash"],
  paymentPreference: "CASH",
  termsAccepted: true,
  careAcknowledged: true,
  requestAcknowledged: true,
};

describe("production booking service", () => {
  it("revalidates and calculates the estimate on the server", async () => {
    const create = vi.fn<(command: CreateBookingCommand) => Promise<{ orderId: string }>>(async () => ({ orderId: "order-1" }));
    const repository: BookingRepository = { create };
    const receipt = await submitBooking(
      { draft: validDraft, idempotencyKey: "df4a603d-9ed1-46f0-9587-a53206261063" },
      repository,
      {
        now: () => new Date("2026-10-12T15:00:00.000Z"),
        guestToken: () => "review-token-that-is-never-stored-raw",
        referenceSuffix: () => "Q7K",
      },
    );

    expect(create).toHaveBeenCalledOnce();
    const command = create.mock.calls[0]?.[0];
    expect(command?.estimate.knownTotalJmd).toBe(1300);
    expect(command?.guestTokenHash).not.toContain("review-token");
    expect(receipt).toMatchObject({
      reference: "FF-261012-Q7K",
      status: "AWAITING_STAFF_CONFIRMATION",
      estimatedTotalJmd: 1300,
      accessToken: "review-token-that-is-never-stored-raw",
    });
  });

  it("rejects a booking before persistence when validation fails", async () => {
    const repository: BookingRepository = { create: vi.fn() };
    await expect(submitBooking(
      { draft: { ...validDraft, phone: "bad" }, idempotencyKey: "df4a603d-9ed1-46f0-9587-a53206261063" },
      repository,
    )).rejects.toThrow("Booking validation failed");
    expect(repository.create).not.toHaveBeenCalled();
  });
});
