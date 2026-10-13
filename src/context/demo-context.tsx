"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { calculateEstimate } from "@/lib/pricing";
import type { BookingDraft, DemoOrder, OrderStatus, ServiceNotice } from "@/lib/models";

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
      history: [{ id: "evt-1", status: "REQUESTED", actor: "Customer", occurredAt: "2026-10-12T13:00:00.000Z", note: "Booking request submitted." }]
    },
    {
      id: "demo-2", reference: "FF-241012-M4R", guestToken: "demo-m4r", customerName: "M. Reid", phoneMasked: "•••-•••-0182",
      location: "New Kingston", pickupDate: "2026-10-15", pickupSlot: "8:00–8:30 p.m.", status: "PRICE_APPROVAL_REQUIRED",
      studentStatus: "NOT_APPLICABLE", paymentStatus: "PENDING", estimate: makeEstimate("NON_STUDENT", 12, [{ itemId: "iron-shirt", quantity: 2 }]), createdAt: "2026-10-12T14:20:00.000Z",
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
      history: [{ id: "evt-3", status: "PAYMENT_REVIEW", actor: "Customer", occurredAt: "2026-10-12T12:00:00.000Z", note: "Proof metadata uploaded; payment is not verified." }]
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
      history: [{ id: randomCode(12), status: "REQUESTED", actor: "Customer", occurredAt: now, note: "Booking request submitted with Terms v0.1-draft consent." }]
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

  const value = useMemo<DemoContextValue>(() => ({
    ...state, ready, submitBooking, updateOrderStatus, setStudentStatus, markPaymentProofForReview,
    toggleNotice: (id) => setState((current) => ({ ...current, notices: current.notices.map((notice) => notice.id === id ? { ...notice, active: !notice.active } : notice) })),
    setDemoRole: (demoRole) => setState((current) => ({ ...current, demoRole })),
    resetDemo: () => setState(seeded)
  }), [markPaymentProofForReview, ready, setStudentStatus, state, submitBooking, updateOrderStatus]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used within DemoProvider.");
  return context;
}
