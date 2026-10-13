import { z } from "zod";
import { isSlotAllowed } from "./availability";

const jamaicanOrInternationalPhone = /^(?:\+?1[-.\s]?)?(?:876|658)[-.\s]?\d{3}[-.\s]?\d{4}$|^\+[2-9]\d{7,14}$/;

export const quantitySelectionSchema = z.object({ itemId: z.string().min(1), quantity: z.number().int().min(0).max(40) });

export const bookingSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100),
  phone: z.string().trim().regex(jamaicanOrInternationalPhone, "Enter a Jamaican or international mobile number."),
  email: z.email("Enter a valid email address."),
  bookAs: z.enum(["GUEST", "ACCOUNT"]),
  customerCategory: z.enum(["STUDENT", "NON_STUDENT"]),
  institution: z.string().trim().max(120).optional(),
  studentIdNumber: z.string().trim().max(80).optional(),
  addressType: z.enum(["CAMPUS", "APARTMENT", "HOUSE", "OTHER"]),
  campusOrBuilding: z.string().trim().max(140).optional(),
  addressLine: z.string().trim().min(5, "Enter a pickup address.").max(180),
  community: z.string().trim().min(2, "Enter the Kingston community or area.").max(100),
  landmark: z.string().trim().max(160).optional(),
  handoffNotes: z.string().trim().max(500).optional(),
  pickupDate: z.iso.date(),
  pickupSlot: z.string().min(1),
  serviceType: z.enum(["WASH_FOLD", "IRONING", "WASH_AND_IRON"]),
  loadSize: z.union([z.literal(6), z.literal(9), z.literal(12)]).optional(),
  ironingItems: z.array(quantitySelectionSchema).max(10),
  specialItems: z.array(quantitySelectionSchema).max(20),
  preferences: z.array(z.string().max(60)).max(12),
  specialInstructions: z.string().trim().max(1000).optional(),
  paymentPreference: z.enum(["CASH", "BANK_TRANSFER", "CARD_MACHINE"]),
  referralSource: z.string().trim().max(100).optional(),
  termsAccepted: z.literal(true, { error: "Accept the draft Terms to continue." }),
  careAcknowledged: z.literal(true, { error: "Confirm pockets are empty and care items are declared." }),
  requestAcknowledged: z.literal(true, { error: "Acknowledge that this is a request pending confirmation." })
}).superRefine((value, context) => {
  if (value.customerCategory === "STUDENT" && !value.institution) context.addIssue({ code: "custom", path: ["institution"], message: "Enter your institution for student verification." });
  if (value.serviceType !== "IRONING" && !value.loadSize) context.addIssue({ code: "custom", path: ["loadSize"], message: "Choose a load size." });
  if (!isSlotAllowed(value.pickupDate, value.pickupSlot)) context.addIssue({ code: "custom", path: ["pickupSlot"], message: "Choose an available pickup window for that date." });
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  message: z.string().trim().min(10).max(1500),
  website: z.string().max(0, "Spam check failed.")
});
