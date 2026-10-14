export const NOTIFICATION_EVENTS = [
  "REQUEST_RECEIVED",
  "STUDENT_REVIEW_NEEDED",
  "REQUEST_CONFIRMED",
  "PICKUP_REMINDER",
  "PRICE_DECISION_NEEDED",
  "PAYMENT_PROOF_RECEIVED",
  "PAYMENT_VERIFIED",
  "CARE_UPDATE",
  "READY_FOR_RETURN",
  "RETURN_REMINDER",
  "ORDER_COMPLETED",
  "SERVICE_EXCEPTION",
] as const;

export type NotificationEvent = typeof NOTIFICATION_EVENTS[number];
export type NotificationChannel = "EMAIL" | "WHATSAPP" | "IN_APP";

interface NotificationDefinition {
  templateKey: string;
  channels: readonly NotificationChannel[];
  customerSummary: string;
  requiresOptIn?: boolean;
}

export const NOTIFICATION_CATALOGUE: Record<NotificationEvent, NotificationDefinition> = {
  REQUEST_RECEIVED: { templateKey: "request-received", channels: ["EMAIL", "IN_APP"], customerSummary: "Pickup request received; staff confirmation is still required." },
  STUDENT_REVIEW_NEEDED: { templateKey: "student-review-needed", channels: ["EMAIL", "IN_APP"], customerSummary: "Student eligibility is awaiting review." },
  REQUEST_CONFIRMED: { templateKey: "request-confirmed", channels: ["EMAIL", "IN_APP", "WHATSAPP"], customerSummary: "FreshFold confirmed the pickup request.", requiresOptIn: true },
  PICKUP_REMINDER: { templateKey: "pickup-reminder", channels: ["EMAIL", "IN_APP", "WHATSAPP"], customerSummary: "A confirmed pickup window is approaching.", requiresOptIn: true },
  PRICE_DECISION_NEEDED: { templateKey: "price-decision-needed", channels: ["EMAIL", "IN_APP", "WHATSAPP"], customerSummary: "A revised estimate needs a decision.", requiresOptIn: true },
  PAYMENT_PROOF_RECEIVED: { templateKey: "payment-proof-received", channels: ["EMAIL", "IN_APP"], customerSummary: "Payment proof was received for review; payment is not yet verified." },
  PAYMENT_VERIFIED: { templateKey: "payment-verified", channels: ["EMAIL", "IN_APP"], customerSummary: "Payment was independently verified." },
  CARE_UPDATE: { templateKey: "care-update", channels: ["IN_APP"], customerSummary: "A new care-stage update is available." },
  READY_FOR_RETURN: { templateKey: "ready-for-return", channels: ["EMAIL", "IN_APP", "WHATSAPP"], customerSummary: "The order is ready for a confirmed return window.", requiresOptIn: true },
  RETURN_REMINDER: { templateKey: "return-reminder", channels: ["EMAIL", "IN_APP", "WHATSAPP"], customerSummary: "A confirmed return window is approaching.", requiresOptIn: true },
  ORDER_COMPLETED: { templateKey: "order-completed", channels: ["EMAIL", "IN_APP"], customerSummary: "The order was marked complete." },
  SERVICE_EXCEPTION: { templateKey: "service-exception", channels: ["EMAIL", "IN_APP", "WHATSAPP"], customerSummary: "FreshFold needs to discuss an exception before work continues.", requiresOptIn: true },
};

export function notificationDefinition(event: NotificationEvent, channel: NotificationChannel, optedIn: boolean) {
  const definition = NOTIFICATION_CATALOGUE[event];
  if (!definition.channels.includes(channel)) throw new Error(`${channel} is not approved for ${event}.`);
  if (channel === "WHATSAPP" && definition.requiresOptIn && !optedIn) throw new Error("WhatsApp opt-in is required.");
  return definition;
}
