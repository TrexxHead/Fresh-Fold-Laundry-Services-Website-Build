"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { calculateEstimate } from "@/lib/pricing";
import type { BookingDraft, DemoOrder, OperationEvent, OrderStatus, ServiceNotice } from "@/lib/models";

const STORAGE_KEY = "freshfold-owner-review-v1";

interface DemoState {
  orders: DemoOrder[];
  notices: ServiceNotice[];
  demoRole: "ADMIN" | "SUPER_ADMIN";
}

interface DemoContextValue extends DemoState {
  ready: boolean;
  submitBooking: (draft: BookingDraft, idempotencyKey: string) => DemoOrder;
  updateOrderStatus: (id: string, status: OrderStatus, note?: string) => void;
  setStudentStatus: (id: string, status: "VERIFIED" | "REJECTED", reason: string) => void;
  markPaymentProofForReview: (id: string) => void;
  decidePriceRevision: (id: string, decision: "APPROVED" | "REJECTED") => void;
  requestReschedule: (id: string, pickupDate: string, pickupSlot: string, note: string) => void;
  submitSupportRequest: (id: string, note: string) => void;
  appendOperationEvent: (id: string, event: Omit<OperationEvent, "id" | "occurredAt">) => void;
  toggleNotice: (id: string) => void;
  setDemoRole: (role: "ADMIN" | "SUPER_ADMIN") => void;
  resetDemo: () => void;
}

const makeEstimate = (category: "STUDENT" | "NON_STUDENT", loadSize: 6 | 9 | 12, items: { itemId: string; quantity: number }[] = []) =>
  calculateEstimate({ customerCategory: category, studentVerified: category !== "STUDENT", serviceType: "WASH_FOLD", loadSize, items }, "2026-10-12T13:00:00.000Z");

const seeded: DemoState = {
  demoRole: "ADMIN",
  notices: [
    { id: "notice-1", title: "Owner review environment", body: "Pickup availability shown here is sample capacity for testing. Staff still confirms every request.", active: true, severity: "INFO" },
    { id: "notice-2", title: "Holiday closure", body: "Example closure notice — replace with an approved date before publication.", active: false, severity: "CLOSURE" }
  ],
  orders: [
    {
      id: "demo-1", reference: "FF-241012-A7K", guestToken: "demo-a7k", customerName: "Alicia Brown", phoneMasked: "•••-•••-6339",
      location: "UWI Mona", pickupDate: "2026-10-14", pickupSlot: "11:00–11:30 a.m.", status: "AWAITING_STUDENT_VERIFICATION",
      studentStatus: "PENDING", paymentStatus: "NOT_REQUESTED", estimate: makeEstimate("STUDENT", 9), createdAt: "2026-10-12T13:00:00.000Z",
      serviceType: "WASH_FOLD", loadSize: 9, carePreferences: ["Cold-water wash", "No fabric softener"], bagCount: 1,
      history: [{ id: "evt-1", status: "REQUESTED", actor: "Customer", occurredAt: "2026-10-12T13:00:00.000Z", note: "Booking request submitted." }],
      communications: [{ id: "com-1", channel: "WHATSAPP", direction: "SYSTEM", summary: "Request received; staff confirmation is still required.", deliveryStatus: "DEMO", occurredAt: "2026-10-12T13:01:00.000Z" }],
      changeRequests: [], operationEvents: []
    },
    {
      id: "demo-2", reference: "FF-241012-M4R", guestToken: "demo-m4r", customerName: "M. Reid", phoneMasked: "•••-•••-0182",
      location: "New Kingston", pickupDate: "2026-10-15", pickupSlot: "8:00–8:30 p.m.", status: "PRICE_APPROVAL_REQUIRED",
      studentStatus: "NOT_APPLICABLE", paymentStatus: "PENDING", estimate: makeEstimate("NON_STUDENT", 12, [{ itemId: "iron-shirt", quantity: 2 }]), createdAt: "2026-10-12T14:20:00.000Z",
      serviceType: "WASH_AND_IRON", loadSize: 12, carePreferences: ["Fragrance-free / sensitive-skin products"], actualWeightLb: 14.2, bagCount: 2,
      priceRevision: { originalTotalJmd: 2750, revisedTotalJmd: 3150, reason: "Demo: the measured load is above the selected 12 lb package. Final excess-weight policy still requires owner approval.", status: "PENDING" },
      invoice: { invoiceNumber: "DRAFT-FF-0002", amountJmd: 3150, status: "DRAFT" },
      communications: [{ id: "com-2", channel: "WHATSAPP", direction: "OUTBOUND", summary: "A revised amount is ready for your review.", deliveryStatus: "DEMO", occurredAt: "2026-10-12T17:02:00.000Z" }],
      changeRequests: [], operationEvents: [
        { id: "op-2a", type: "RECEIVED", label: "Laundry received at the care hub", station: "Intake", customerVisible: true, occurredAt: "2026-10-12T16:40:00.000Z" },
        { id: "op-2b", type: "WEIGHT", label: "Two bags weighed at 14.2 lb", station: "Intake", customerVisible: true, occurredAt: "2026-10-12T16:55:00.000Z" }
      ],
      history: [
        { id: "evt-2a", status: "REQUESTED", actor: "Customer", occurredAt: "2026-10-12T14:20:00.000Z" },
        { id: "evt-2b", status: "PICKED_UP", actor: "Demo staff", occurredAt: "2026-10-12T16:40:00.000Z" },
        { id: "evt-2c", status: "WEIGHED", actor: "Demo staff", occurredAt: "2026-10-12T16:55:00.000Z", note: "Example overweight adjustment awaiting approval." },
        { id: "evt-2d", status: "PRICE_APPROVAL_REQUIRED", actor: "Demo staff", occurredAt: "2026-10-12T17:00:00.000Z" }
      ]
    },
    {
      id: "demo-3", reference: "FF-241011-P2N", guestToken: "demo-p2n", customerName: "Jordan Lee", phoneMasked: "•••-•••-7721",
      location: "Half-Way Tree", pickupDate: "2026-10-14", pickupSlot: "1:00–1:30 p.m.", status: "PAYMENT_REVIEW",
      studentStatus: "NOT_APPLICABLE", paymentStatus: "REVIEW", estimate: makeEstimate("NON_STUDENT", 6), createdAt: "2026-10-11T18:00:00.000Z",
      serviceType: "WASH_FOLD", loadSize: 6, carePreferences: ["Cold-water wash"], actualWeightLb: 5.8, bagCount: 1, packageCount: 1,
      invoice: { invoiceNumber: "FF-2026-0003", amountJmd: 1300, status: "ISSUED", issuedAt: "2026-10-12T11:30:00.000Z" },
      returnWindow: "Thursday · staff confirmation pending",
      history: [{ id: "evt-3", status: "PAYMENT_REVIEW", actor: "Customer", occurredAt: "2026-10-12T12:00:00.000Z", note: "Proof metadata uploaded; payment is not verified." }],
      communications: [{ id: "com-3", channel: "EMAIL", direction: "SYSTEM", summary: "Transfer proof received for staff review.", deliveryStatus: "DEMO", occurredAt: "2026-10-12T12:01:00.000Z" }],
      changeRequests: [], operationEvents: [
        { id: "op-3a", type: "RECEIVED", label: "Bag received", station: "Intake", customerVisible: true, occurredAt: "2026-10-12T09:30:00.000Z" },
        { id: "op-3b", type: "WASHING", label: "Care cycle started", station: "Wash", customerVisible: true, occurredAt: "2026-10-12T10:15:00.000Z" },
        { id: "op-3c", type: "PACKED", label: "Quality checked and packed", station: "Pack", customerVisible: true, occurredAt: "2026-10-12T11:20:00.000Z" }
      ]
    }
  ]
};

const DemoContext = createContext<DemoContextValue | null>(null);

function randomCode(length = 5): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(seeded);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let restored: DemoState | null = null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) restored = JSON.parse(stored) as DemoState;
    } catch { /* Corrupt local demo state falls back to safe seed data. */ }
    const timer = window.setTimeout(() => {
      if (restored) setState(restored);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const submitBooking = useCallback((draft: BookingDraft, idempotencyKey: string) => {
    const prior = state.orders.find((order) => order.id === idempotencyKey);
    if (prior) return prior;
    const now = new Date().toISOString();
    const estimate = calculateEstimate({
      customerCategory: draft.customerCategory,
      studentVerified: false,
      serviceType: draft.serviceType,
      loadSize: draft.loadSize,
      items: [...draft.ironingItems, ...draft.specialItems]
    }, now);
    const order: DemoOrder = {
      id: idempotencyKey,
      reference: `FF-${now.slice(2, 10).replaceAll("-", "")}-${randomCode(3)}`,
      guestToken: randomCode(24),
      customerName: draft.fullName,
      phoneMasked: `•••-•••-${draft.phone.replace(/\D/g, "").slice(-4)}`,
      location: draft.campusOrBuilding || draft.community,
      pickupDate: draft.pickupDate,
      pickupSlot: draft.pickupSlot,
      status: draft.customerCategory === "STUDENT" ? "AWAITING_STUDENT_VERIFICATION" : "AWAITING_STAFF_CONFIRMATION",
      studentStatus: draft.customerCategory === "STUDENT" ? "PENDING" : "NOT_APPLICABLE",
      paymentStatus: "NOT_REQUESTED",
      estimate,
      createdAt: now,
      serviceType: draft.serviceType,
      loadSize: draft.loadSize,
      carePreferences: draft.preferences,
      history: [{ id: randomCode(12), status: "REQUESTED", actor: "Customer", occurredAt: now, note: "Booking request submitted with Terms v0.1-draft consent." }],
      communications: [{ id: randomCode(12), channel: "IN_APP", direction: "SYSTEM", summary: "Demo request received; staff confirmation is still required.", deliveryStatus: "DEMO", occurredAt: now }],
      changeRequests: [],
      operationEvents: []
    };
    setState((current) => ({ ...current, orders: [order, ...current.orders] }));
    return order;
  }, [state.orders]);

  const updateOrderStatus = useCallback((id: string, status: OrderStatus, note?: string) => {
    setState((current) => ({ ...current, orders: current.orders.map((order) => order.id !== id ? order : {
      ...order, status,
      history: [...order.history, { id: randomCode(12), status, actor: `Demo ${current.demoRole.toLowerCase().replace("_", " ")}`, occurredAt: new Date().toISOString(), note }]
    }) }));
  }, []);

  const markPaymentProofForReview = useCallback((id: string) => {
    setState((current) => ({ ...current, orders: current.orders.map((order) => order.id !== id ? order : {
      ...order, status: "PAYMENT_REVIEW", paymentStatus: "REVIEW",
      history: [...order.history, { id: randomCode(12), status: "PAYMENT_REVIEW", actor: "Customer", occurredAt: new Date().toISOString(), note: "Demo upload metadata recorded. Payment requires staff verification." }]
    }) }));
  }, []);

  const setStudentStatus = useCallback((id: string, studentStatus: "VERIFIED" | "REJECTED", reason: string) => {
    const status: OrderStatus = studentStatus === "VERIFIED" ? "AWAITING_STAFF_CONFIRMATION" : "ON_HOLD";
    setState((current) => ({ ...current, orders: current.orders.map((order) => order.id !== id ? order : {
      ...order, studentStatus, status,
      history: [...order.history, { id: randomCode(12), status, actor: `Demo ${current.demoRole.toLowerCase().replace("_", " ")}`, occurredAt: new Date().toISOString(), note: `Student verification ${studentStatus.toLowerCase()}: ${reason}` }]
    }) }));
  }, []);

  const decidePriceRevision = useCallback((id: string, decision: "APPROVED" | "REJECTED") => {
    const now = new Date().toISOString();
    const status: OrderStatus = decision === "APPROVED" ? "PRICE_APPROVED" : "ON_HOLD";
    setState((current) => ({ ...current, orders: current.orders.map((order) => order.id !== id || !order.priceRevision ? order : {
      ...order,
      status,
      priceRevision: { ...order.priceRevision, status: decision, decidedAt: now },
      history: [...order.history, { id: randomCode(12), status, actor: "Customer", occurredAt: now, note: `Revised price ${decision.toLowerCase()} in the demo order hub.` }],
      communications: [...(order.communications ?? []), { id: randomCode(12), channel: "IN_APP" as const, direction: "INBOUND" as const, summary: `Customer ${decision.toLowerCase()} the revised price.`, deliveryStatus: "DEMO" as const, occurredAt: now }]
    }) }));
  }, []);

  const requestReschedule = useCallback((id: string, pickupDate: string, pickupSlot: string, note: string) => {
    const now = new Date().toISOString();
    setState((current) => ({ ...current, orders: current.orders.map((order) => order.id !== id ? order : {
      ...order,
      status: "RESCHEDULE_REQUESTED",
      changeRequests: [...(order.changeRequests ?? []), { id: randomCode(12), type: "RESCHEDULE" as const, status: "PENDING" as const, note, requestedDate: pickupDate, requestedSlot: pickupSlot, createdAt: now }],
      history: [...order.history, { id: randomCode(12), status: "RESCHEDULE_REQUESTED", actor: "Customer", occurredAt: now, note: "Alternative pickup requested; existing capacity has not been moved." }]
    }) }));
  }, []);

  const submitSupportRequest = useCallback((id: string, note: string) => {
    const now = new Date().toISOString();
    setState((current) => ({ ...current, orders: current.orders.map((order) => order.id !== id ? order : {
      ...order,
      changeRequests: [...(order.changeRequests ?? []), { id: randomCode(12), type: "GENERAL_SUPPORT" as const, status: "PENDING" as const, note, createdAt: now }],
      communications: [...(order.communications ?? []), { id: randomCode(12), channel: "IN_APP" as const, direction: "INBOUND" as const, summary: "Customer submitted a private support request.", deliveryStatus: "DEMO" as const, occurredAt: now }]
    }) }));
  }, []);

  const appendOperationEvent = useCallback((id: string, event: Omit<OperationEvent, "id" | "occurredAt">) => {
    setState((current) => ({ ...current, orders: current.orders.map((order) => order.id !== id ? order : {
      ...order,
      operationEvents: [...(order.operationEvents ?? []), { ...event, id: randomCode(12), occurredAt: new Date().toISOString() }]
    }) }));
  }, []);

  const value = useMemo<DemoContextValue>(() => ({
    ...state, ready, submitBooking, updateOrderStatus, setStudentStatus, markPaymentProofForReview,
    decidePriceRevision, requestReschedule, submitSupportRequest, appendOperationEvent,
    toggleNotice: (id) => setState((current) => ({ ...current, notices: current.notices.map((notice) => notice.id === id ? { ...notice, active: !notice.active } : notice) })),
    setDemoRole: (demoRole) => setState((current) => ({ ...current, demoRole })),
    resetDemo: () => setState(seeded)
  }), [appendOperationEvent, decidePriceRevision, markPaymentProofForReview, ready, requestReschedule, setStudentStatus, state, submitBooking, submitSupportRequest, updateOrderStatus]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used within DemoProvider.");
  return context;
}
