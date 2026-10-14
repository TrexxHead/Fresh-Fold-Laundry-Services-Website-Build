import type { OrderStatus } from "./models";

export const FRIENDLY_STATUS: Record<OrderStatus, string> = {
  REQUESTED: "Request received",
  AWAITING_STUDENT_VERIFICATION: "Student ID review needed",
  AWAITING_STAFF_CONFIRMATION: "Waiting for staff confirmation",
  CONFIRMED: "Confirmed",
  PICKUP_SCHEDULED: "Pickup scheduled",
  PICKED_UP: "Laundry collected",
  WEIGHED: "Weighed and inspected",
  PRICE_APPROVAL_REQUIRED: "Price approval needed",
  PRICE_APPROVED: "Updated price approved",
  PAYMENT_PENDING: "Payment pending",
  PAYMENT_REVIEW: "Payment proof under review",
  PAID: "Payment verified",
  PROCESSING: "Laundry in care",
  READY_FOR_RETURN: "Ready for return",
  OUT_FOR_DELIVERY: "On the way back",
  COMPLETED: "Completed",
  RESCHEDULE_REQUESTED: "Reschedule requested",
  ON_HOLD: "On hold — staff will contact you",
  CANCELLED: "Cancelled"
};

export function statusClass(status: OrderStatus): string {
  if (status === "PAID" || status === "COMPLETED" || status === "PRICE_APPROVED") return "pill pill-success";
  if (status.includes("REVIEW") || status.includes("REQUIRED") || status.includes("AWAITING") || status === "ON_HOLD") return "pill pill-warning";
  return "pill";
}
