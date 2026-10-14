export type CustomerCategory = "STUDENT" | "NON_STUDENT";
export type LoadSize = 6 | 9 | 12;
export type ServiceType = "WASH_FOLD" | "IRONING" | "WASH_AND_IRON";
export type PricingType = "FIXED" | "PER_ITEM" | "PER_BUNDLE" | "SURCHARGE" | "STARTING_AT" | "QUOTE_REQUIRED";
export type UserRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";

export const ORDER_STATUSES = [
  "REQUESTED", "AWAITING_STUDENT_VERIFICATION", "AWAITING_STAFF_CONFIRMATION", "CONFIRMED",
  "PICKUP_SCHEDULED", "PICKED_UP", "WEIGHED", "PRICE_APPROVAL_REQUIRED", "PRICE_APPROVED",
  "PAYMENT_PENDING", "PAYMENT_REVIEW", "PAID", "PROCESSING", "READY_FOR_RETURN",
  "OUT_FOR_DELIVERY", "COMPLETED", "RESCHEDULE_REQUESTED", "ON_HOLD", "CANCELLED"
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["NOT_REQUESTED", "PENDING", "REVIEW", "PAID", "REJECTED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface CatalogueItem {
  id: string;
  name: string;
  shortName: string;
  category: "LOAD" | "IRONING" | "SPECIAL_CARE" | "PRODUCT" | "FUTURE";
  pricingType: PricingType;
  amountJmd: number | null;
  unitLabel?: string;
  note: string;
  active: boolean;
  public: boolean;
  needsReview: boolean;
  effectiveFrom: string;
  version: number;
}

export interface QuantitySelection { itemId: string; quantity: number }

export interface EstimateInput {
  customerCategory: CustomerCategory;
  studentVerified: boolean;
  serviceType: ServiceType;
  loadSize?: LoadSize;
  items: QuantitySelection[];
}

export interface EstimateLine {
  id: string;
  label: string;
  detail: string;
  quantity: number;
  amountJmd: number | null;
  pricingType: PricingType;
  requiresReview: boolean;
}

export interface Estimate {
  version: number;
  currency: "JMD";
  knownTotalJmd: number;
  provisional: boolean;
  hasQuoteRequired: boolean;
  lines: EstimateLine[];
  createdAt: string;
}

export interface BookingDraft {
  fullName: string;
  phone: string;
  email: string;
  bookAs: "GUEST" | "ACCOUNT";
  customerCategory: CustomerCategory;
  institution?: string;
  studentIdNumber?: string;
  addressType: "CAMPUS" | "APARTMENT" | "HOUSE" | "OTHER";
  campusOrBuilding?: string;
  addressLine: string;
  community: string;
  landmark?: string;
  handoffNotes?: string;
  pickupDate: string;
  pickupSlot: string;
  serviceType: ServiceType;
  loadSize?: LoadSize;
  ironingItems: QuantitySelection[];
  specialItems: QuantitySelection[];
  preferences: string[];
  specialInstructions?: string;
  paymentPreference: "CASH" | "BANK_TRANSFER" | "CARD_MACHINE";
  referralSource?: string;
  termsAccepted: boolean;
  careAcknowledged: boolean;
  requestAcknowledged: boolean;
}

export interface StatusEvent {
  id: string;
  status: OrderStatus;
  actor: string;
  occurredAt: string;
  note?: string;
}

export interface CustomerCommunication {
  id: string;
  channel: "EMAIL" | "WHATSAPP" | "PHONE" | "IN_APP";
  direction: "OUTBOUND" | "INBOUND" | "SYSTEM";
  summary: string;
  deliveryStatus: "DEMO" | "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  occurredAt: string;
}

export interface PriceRevision {
  originalTotalJmd: number;
  revisedTotalJmd: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decidedAt?: string;
}

export interface InvoiceSnapshot {
  invoiceNumber: string;
  amountJmd: number;
  status: "DRAFT" | "ISSUED" | "PAID" | "VOID" | "REFUNDED";
  issuedAt?: string;
}

export interface ChangeRequest {
  id: string;
  type: "RESCHEDULE" | "CANCELLATION" | "PRICE_QUESTION" | "GENERAL_SUPPORT";
  status: "PENDING" | "APPROVED" | "DECLINED" | "WITHDRAWN";
  note: string;
  requestedDate?: string;
  requestedSlot?: string;
  createdAt: string;
}

export interface OperationEvent {
  id: string;
  type: "BAG_COUNT" | "WEIGHT" | "RECEIVED" | "SORTED" | "WASHING" | "DRYING" | "FOLDING" | "IRONING" | "QUALITY_CHECK" | "PACKED" | "READY" | "EXCEPTION" | "REWASH" | "HANDOFF";
  label: string;
  station?: string;
  customerVisible: boolean;
  occurredAt: string;
}

export interface DemoOrder {
  id: string;
  reference: string;
  guestToken: string;
  customerName: string;
  phoneMasked: string;
  location: string;
  pickupDate: string;
  pickupSlot: string;
  status: OrderStatus;
  studentStatus: "NOT_APPLICABLE" | "PENDING" | "VERIFIED" | "REJECTED";
  paymentStatus: PaymentStatus;
  estimate: Estimate;
  createdAt: string;
  history: StatusEvent[];
  serviceType?: ServiceType;
  loadSize?: LoadSize;
  carePreferences?: string[];
  actualWeightLb?: number;
  returnWindow?: string;
  priceRevision?: PriceRevision;
  invoice?: InvoiceSnapshot;
  communications?: CustomerCommunication[];
  changeRequests?: ChangeRequest[];
  operationEvents?: OperationEvent[];
  bagCount?: number;
  packageCount?: number;
  internalNote?: string;
}

export interface CustomerOrderView {
  id: string;
  reference: string;
  customerName: string;
  location: string;
  pickupDate: string;
  pickupSlot: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  studentStatus: DemoOrder["studentStatus"];
  estimate: Estimate;
  serviceType?: ServiceType;
  loadSize?: LoadSize;
  carePreferences: string[];
  actualWeightLb?: number;
  returnWindow?: string;
  priceRevision?: PriceRevision;
  invoice?: InvoiceSnapshot;
  history: StatusEvent[];
  communications: CustomerCommunication[];
  changeRequests: ChangeRequest[];
  operationEvents: OperationEvent[];
  bagCount?: number;
  packageCount?: number;
}

export function toCustomerOrderView(order: DemoOrder): CustomerOrderView {
  return {
    id: order.id,
    reference: order.reference,
    customerName: order.customerName,
    location: order.location,
    pickupDate: order.pickupDate,
    pickupSlot: order.pickupSlot,
    status: order.status,
    paymentStatus: order.paymentStatus,
    studentStatus: order.studentStatus,
    estimate: order.estimate,
    serviceType: order.serviceType,
    loadSize: order.loadSize,
    carePreferences: order.carePreferences ?? [],
    actualWeightLb: order.actualWeightLb,
    returnWindow: order.returnWindow,
    priceRevision: order.priceRevision,
    invoice: order.invoice,
    history: order.history,
    communications: order.communications ?? [],
    changeRequests: order.changeRequests ?? [],
    operationEvents: (order.operationEvents ?? []).filter((event) => event.customerVisible),
    bagCount: order.bagCount,
    packageCount: order.packageCount,
  };
}

export interface ServiceNotice {
  id: string;
  title: string;
  body: string;
  active: boolean;
  severity: "INFO" | "CLOSURE";
}
