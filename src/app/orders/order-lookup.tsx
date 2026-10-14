"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDemo } from "@/context/demo-context";
import { FRIENDLY_STATUS } from "@/lib/status";
import { formatJmd } from "@/lib/pricing";
import { publicRuntime } from "@/lib/runtime";
import { toCustomerOrderView, type CustomerOrderView } from "@/lib/models";
import { nextAvailableDates, slotsForDate } from "@/lib/availability";
import { Notice } from "@/components/ui";
import { Icon } from "@/components/icon";

export function OrderLookup() {
  const { orders, decidePriceRevision, requestReschedule, submitSupportRequest } = useDemo();
  const [reference, setReference] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [searched, setSearched] = useState(false);
  const [remoteOrder, setRemoteOrder] = useState<CustomerOrderView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const localOrder = useMemo(() => orders.find((entry) => entry.reference.toLowerCase() === reference.trim().toLowerCase()), [orders, reference]);
  const order = publicRuntime.isReview ? (localOrder ? toCustomerOrderView(localOrder) : null) : remoteOrder;

  const lookupProductionOrder = useCallback(async (requestReference: string, token: string) => {
    setLoading(true);
    setError("");
    setRemoteOrder(null);
    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: requestReference, accessToken: token }),
      });
      const payload = await response.json() as { order?: CustomerOrderView; message?: string };
      if (!response.ok || !payload.order) throw new Error(payload.message || "The order could not be opened.");
      setRemoteOrder(payload.order);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "The order could not be opened.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const suppliedReference = params.get("reference");
    const suppliedToken = params.get("token");
    if (suppliedToken) {
      const cleanUrl = suppliedReference ? `/orders?reference=${encodeURIComponent(suppliedReference)}` : "/orders";
      window.history.replaceState(null, "", cleanUrl);
    }
    const timer = window.setTimeout(() => {
      if (suppliedReference) setReference(suppliedReference);
      if (suppliedToken) setAccessToken(suppliedToken);
      if (suppliedReference && (publicRuntime.isReview || suppliedToken)) {
        setSearched(true);
        if (!publicRuntime.isReview) void lookupProductionOrder(suppliedReference, suppliedToken ?? "");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [lookupProductionOrder]);

  const submitLookup = (event: React.FormEvent) => {
    event.preventDefault();
    setSearched(true);
    setActionMessage("");
    if (!publicRuntime.isReview) void lookupProductionOrder(reference, accessToken);
  };

  async function performOrderAction(action: "PRICE_DECISION" | "RESCHEDULE" | "SUPPORT", payload: Record<string, string>) {
    if (publicRuntime.isReview) return;
    setActionBusy(true);
    setActionMessage("");
    setError("");
    try {
      const response = await fetch("/api/orders/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, accessToken, action, payload }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "This action could not be completed.");
      await lookupProductionOrder(reference, accessToken);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "This action could not be completed.");
      throw actionError;
    } finally {
      setActionBusy(false);
    }
  }

  return <div className="order-hub">
    <section className="card wizard-card lookup-card">
      <form onSubmit={submitLookup}>
        <div className="lookup-fields">
          <div className="form-group"><label htmlFor="order-reference">Order reference</label><input className="input" id="order-reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="FF-241012-A7K" required autoComplete="off"/></div>
          {!publicRuntime.isReview && <div className="form-group"><label htmlFor="access-token">Private access code</label><input className="input" id="access-token" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} required autoComplete="off"/><span className="field-hint">Use the private code or link from your confirmation. It expires automatically.</span></div>}
        </div>
        <button className="button" type="submit" disabled={loading} aria-busy={loading}>{loading ? "Opening securely…" : "Open order hub"}</button>
      </form>
      {error && <div className="section-gap"><Notice tone="warning" title="Order not opened">{error}</Notice></div>}
      {searched && !loading && !order && !error && <div className="section-gap"><Notice tone="warning" title="No matching order">Check the reference. Production responses are rate-limited and intentionally avoid revealing whether another person’s order exists.</Notice></div>}
    </section>

    {order && <OrderHub
      order={order}
      actionMessage={actionMessage}
      actionBusy={actionBusy}
      onPriceDecision={async (decision) => {
        if (publicRuntime.isReview) decidePriceRevision(order.id, decision);
        else await performOrderAction("PRICE_DECISION", { decision });
        setActionMessage(`Revised price ${decision.toLowerCase()}${publicRuntime.isReview ? " in the review demo" : ""}.`);
      }}
      onReschedule={async (date, slot, note) => {
        if (publicRuntime.isReview) requestReschedule(order.id, date, slot, note);
        else await performOrderAction("RESCHEDULE", { pickupDate: date, pickupSlot: slot, note });
        setActionMessage("Reschedule request added for staff review; the existing slot was not moved automatically.");
      }}
      onSupport={async (note) => {
        if (publicRuntime.isReview) submitSupportRequest(order.id, note);
        else await performOrderAction("SUPPORT", { note });
        setActionMessage("Private support request added to the review queue.");
      }}
    />}
  </div>;
}

function OrderHub({ order, actionMessage, actionBusy, onPriceDecision, onReschedule, onSupport }: {
  order: CustomerOrderView;
  actionMessage: string;
  actionBusy: boolean;
  onPriceDecision: (decision: "APPROVED" | "REJECTED") => Promise<void>;
  onReschedule: (date: string, slot: string, note: string) => Promise<void>;
  onSupport: (note: string) => Promise<void>;
}) {
  const [panel, setPanel] = useState<"overview" | "timeline" | "messages" | "help">("overview");
  return <section className="order-hub-panel" aria-live="polite">
    <header className="order-hub-header"><div><p className="eyebrow">Private order hub</p><h2>{order.reference}</h2><p>{order.customerName} · {order.location}</p></div><span className="status-badge status-info">{FRIENDLY_STATUS[order.status]}</span></header>
    <nav className="hub-tabs" aria-label="Order hub sections">{([['overview', 'Overview'], ['timeline', 'Timeline'], ['messages', 'Messages'], ['help', 'Manage & help']] as const).map(([value, label]) => <button key={value} type="button" aria-current={panel === value ? "page" : undefined} onClick={() => setPanel(value)}>{label}</button>)}</nav>
    {actionMessage && <Notice tone="success" title={publicRuntime.isReview ? "Demo action recorded" : "Request recorded"}>{actionMessage}</Notice>}

    {panel === "overview" && <div className="hub-grid">
      <div className="hub-main">
        <section className="card hub-card"><h3>Pickup and return</h3><div className="summary-line"><span>Pickup request</span><strong>{order.pickupDate}<small>{order.pickupSlot}</small></strong></div><div className="summary-line"><span>Return</span><strong>{order.returnWindow ?? "Staff will confirm"}</strong></div><div className="summary-line"><span>Handoff</span><strong>Direct handoff</strong></div></section>
        <section className="card hub-card"><h3>Care progress</h3>{order.operationEvents.length ? <ol className="care-track">{order.operationEvents.map((event, index) => <li key={event.id} className={index === order.operationEvents.length - 1 ? "current" : "complete"}><span/><div><strong>{event.label}</strong><small>{event.station ? `${event.station} · ` : ""}{new Intl.DateTimeFormat("en-JM", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurredAt))}</small></div></li>)}</ol> : <p className="empty-state">Care-stage updates appear after the direct handoff.</p>}</section>
        {order.priceRevision?.status === "PENDING" && <section className="card hub-card price-decision"><span className="pill pill-warning">Your decision is needed</span><h3>Review a revised estimate</h3><p>{order.priceRevision.reason}</p><div className="price-comparison"><div><span>Original</span><strong>{formatJmd(order.priceRevision.originalTotalJmd)}</strong></div><Icon name="arrow"/><div><span>Revised</span><strong>{formatJmd(order.priceRevision.revisedTotalJmd)}</strong></div></div><p className="fine-print">{publicRuntime.isReview ? "This illustrative demo adjustment does not activate an unresolved excess-weight price." : "Review the documented reason and revised total before deciding. FreshFold will follow up if you do not approve."}</p><div className="hero-actions"><button className="button" type="button" disabled={actionBusy} onClick={() => void onPriceDecision("APPROVED").catch(() => undefined)}>Approve revised amount</button><button className="button button-secondary" type="button" disabled={actionBusy} onClick={() => void onPriceDecision("REJECTED").catch(() => undefined)}>Do not approve</button></div></section>}
      </div>
      <aside className="card hub-card order-financials"><h3>Estimate and payment</h3>{order.estimate.lines.map((line) => <div className="summary-line" key={line.id}><span>{line.label}</span><strong>{line.amountJmd === null ? "Quote" : formatJmd(line.amountJmd)}</strong></div>)}<div className="summary-total"><span>Original estimate</span><strong>{formatJmd(order.estimate.knownTotalJmd)}{order.estimate.provisional ? "*" : ""}</strong></div><div className="summary-line"><span>Actual weight</span><strong>{order.actualWeightLb ? `${order.actualWeightLb} lb` : "Pending"}</strong></div><div className="summary-line"><span>Payment</span><strong>{order.paymentStatus.replaceAll("_", " ").toLowerCase()}</strong></div>{order.invoice && <div className="invoice-mini"><Icon name="file"/><div><strong>{order.invoice.invoiceNumber}</strong><span>{formatJmd(order.invoice.amountJmd)} · {order.invoice.status.toLowerCase()}</span></div><button type="button" onClick={() => window.print()}>{publicRuntime.isReview ? "Print demo invoice" : "Print invoice"}</button></div>}<p className="fine-print">* Student verification, actual weight, inspection, and quote-required work can change the final amount.</p></aside>
    </div>}

    {panel === "timeline" && <div className="hub-grid"><section className="card hub-card"><h3>Order status timeline</h3><ol className="timeline">{[...order.history].reverse().map((event) => <li key={event.id}><strong>{FRIENDLY_STATUS[event.status]}</strong><small>{new Intl.DateTimeFormat("en-JM", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurredAt))}</small>{event.note && <p>{event.note}</p>}</li>)}</ol></section><section className="card hub-card"><h3>Care preferences</h3>{order.carePreferences.length ? <ul className="list-check">{order.carePreferences.map((preference) => <li key={preference}>{preference}</li>)}</ul> : <p>No special preferences recorded.</p>}<Notice title="Requests, not guarantees">Care labels, staff approval, product availability, price, and capacity still apply.</Notice></section></div>}

    {panel === "messages" && <section className="card hub-card"><h3>Service messages</h3>{order.communications.length ? <div className="message-list">{[...order.communications].reverse().map((message) => <article key={message.id}><div><span className="pill">{message.channel.toLowerCase()}</span><small>{new Intl.DateTimeFormat("en-JM", { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.occurredAt))}</small></div><p>{message.summary}</p><span className="delivery-state">{message.deliveryStatus === "DEMO" ? "Demo record — no external message sent" : message.deliveryStatus.toLowerCase()}</span></article>)}</div> : <p className="empty-state">No service messages are available yet.</p>}</section>}

    {panel === "help" && <ManageOrder order={order} actionBusy={actionBusy} onReschedule={onReschedule} onSupport={onSupport}/>}
  </section>;
}

function ManageOrder({ order, actionBusy, onReschedule, onSupport }: { order: CustomerOrderView; actionBusy: boolean; onReschedule: (date: string, slot: string, note: string) => Promise<void>; onSupport: (note: string) => Promise<void> }) {
  const dates = useMemo(() => nextAvailableDates(new Date(), 8), []);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [supportNote, setSupportNote] = useState("");
  return <div className="hub-grid">
    <form className="card hub-card" onSubmit={(event) => { event.preventDefault(); void onReschedule(date, slot, rescheduleNote).then(() => { setDate(""); setSlot(""); setRescheduleNote(""); }).catch(() => undefined); }}><h3>Request another pickup window</h3><p>Staff reviews the request before changing capacity. Your existing window stays in place until confirmation.</p><div className="form-group"><label htmlFor="reschedule-date">Preferred date</label><select className="select" id="reschedule-date" value={date} required onChange={(event) => { setDate(event.target.value); setSlot(""); }}><option value="">Choose date</option>{dates.map((value) => <option key={value} value={value}>{new Intl.DateTimeFormat("en-JM", { dateStyle: "full" }).format(new Date(`${value}T12:00:00`))}</option>)}</select></div><div className="form-group section-gap"><label htmlFor="reschedule-slot">Preferred window</label><select className="select" id="reschedule-slot" value={slot} required disabled={!date || actionBusy} onChange={(event) => setSlot(event.target.value)}><option value="">Choose window</option>{slotsForDate(date).map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div className="form-group section-gap"><label htmlFor="reschedule-note">Note (optional)</label><textarea className="textarea" id="reschedule-note" maxLength={500} value={rescheduleNote} onChange={(event) => setRescheduleNote(event.target.value)}/></div><button className="button section-gap" type="submit" disabled={actionBusy}>{actionBusy ? "Sending…" : "Send reschedule request"}</button></form>
    <form className="card hub-card" onSubmit={(event) => { event.preventDefault(); void onSupport(supportNote).then(() => setSupportNote("")).catch(() => undefined); }}><h3>Private help request</h3><p>Use this for an order question or concern. Do not submit card or banking details.</p><div className="form-group"><label htmlFor="support-note">How can FreshFold help?</label><textarea className="textarea" id="support-note" minLength={10} maxLength={1000} required value={supportNote} onChange={(event) => setSupportNote(event.target.value)}/></div><button className="button section-gap" type="submit" disabled={actionBusy}>{actionBusy ? "Sending…" : "Add support request"}</button><div className="section-gap"><Notice tone="warning" title="Cancellation remains staff-managed">The cancellation cutoff and any charge are not activated until the owner and Jamaican legal adviser approve the rule.</Notice></div></form>
    <section className="card hub-card"><h3>Repeat this service</h3><p>{publicRuntime.isReview ? "Start a fresh request using the same service type and safe care preferences." : "Start a fresh pickup request."} Address, availability, payment, and consent are confirmed again.</p><Link className="button button-secondary" href={publicRuntime.isReview ? `/book?repeat=${encodeURIComponent(order.reference)}` : "/book"}>{publicRuntime.isReview ? "Start a similar request" : "Start a new request"} <Icon name="arrow"/></Link></section>
  </div>;
}
