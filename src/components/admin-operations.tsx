"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/context/demo-context";
import { formatJmd } from "@/lib/pricing";
import { FRIENDLY_STATUS, statusClass } from "@/lib/status";
import type { OperationEvent } from "@/lib/models";
import { Notice } from "./ui";
import { Icon } from "./icon";

const operationChoices: Array<{ value: OperationEvent["type"]; label: string; station: string }> = [
  { value: "RECEIVED", label: "Laundry received", station: "Intake" },
  { value: "SORTED", label: "Sorted for care", station: "Sort" },
  { value: "WASHING", label: "Care cycle started", station: "Wash" },
  { value: "DRYING", label: "Drying in progress", station: "Dry" },
  { value: "FOLDING", label: "Folding in progress", station: "Finish" },
  { value: "IRONING", label: "Ironing in progress", station: "Finish" },
  { value: "QUALITY_CHECK", label: "Quality check completed", station: "Quality" },
  { value: "PACKED", label: "Order packed", station: "Pack" },
  { value: "READY", label: "Ready for return", station: "Dispatch" },
  { value: "EXCEPTION", label: "Care exception recorded", station: "Hold" },
  { value: "REWASH", label: "Rewash started", station: "Wash" },
  { value: "HANDOFF", label: "Return handoff completed", station: "Handoff" },
];

export function DispatchAdminPage() {
  const { orders } = useDemo();
  const grouped = useMemo(() => Map.groupBy([...orders].sort((a, b) => a.pickupSlot.localeCompare(b.pickupSlot)), (order) => order.pickupDate), [orders]);
  return <><AdminHeading title="Dispatch & manifests" body="Plan direct handoffs, group stops, and keep driver-visible information to the minimum required."/><Notice title="Review-mode route board">Assignments and route groups below are synthetic. Production driver access is limited to assigned stops and never exposes student IDs, payment proof, internal audit notes, or unrelated customers.</Notice><div className="dispatch-board section-gap">{[...grouped.entries()].map(([date, dayOrders]) => <section className="card admin-panel dispatch-day" key={date}><header><div><p className="eyebrow">Pickup run</p><h2>{new Intl.DateTimeFormat("en-JM", { weekday: "long", month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`))}</h2></div><span className="pill">{dayOrders.length} stops</span></header><div className="route-summary"><div><span>Route group</span><strong>Demo Kingston run</strong></div><div><span>Assigned to</span><strong>Review driver</strong></div><div><span>Load estimate</span><strong>{dayOrders.reduce((sum, order) => sum + (order.loadSize ?? 0), 0)} lb</strong></div></div><ol className="dispatch-stops">{dayOrders.map((order, index) => <li key={order.id}><span className="stop-number">{index + 1}</span><div><strong>{order.pickupSlot} · {order.location}</strong><small>{order.reference} · {order.bagCount ?? 1} bag{(order.bagCount ?? 1) === 1 ? "" : "s"} · Direct handoff</small></div><span className={statusClass(order.status)}>{FRIENDLY_STATUS[order.status]}</span></li>)}</ol><div className="manifest-actions"><button className="button button-secondary button-small" type="button" onClick={() => window.print()}>Print demo manifest</button><button className="button button-secondary button-small" type="button" disabled>Optimize after maps approval</button></div></section>)}</div></>;
}

export function OperationsAdminPage() {
  const { orders, appendOperationEvent } = useDemo();
  const [selectedId, setSelectedId] = useState(orders[0]?.id ?? "");
  const [eventType, setEventType] = useState<OperationEvent["type"]>("RECEIVED");
  const [customerVisible, setCustomerVisible] = useState(true);
  const selected = orders.find((order) => order.id === selectedId);
  const choice = operationChoices.find((item) => item.value === eventType) ?? operationChoices[0];
  return <><AdminHeading title="Care operations" body="Track custody from bag intake through quality check, packing, and return handoff."/><div className="operations-layout"><section className="card admin-panel"><div className="form-group"><label htmlFor="operations-order">Order</label><select className="select" id="operations-order" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{orders.map((order) => <option value={order.id} key={order.id}>{order.reference} · {order.customerName}</option>)}</select></div>{selected && <><div className="custody-summary"><div><span>Bags</span><strong>{selected.bagCount ?? "Pending"}</strong></div><div><span>Weight</span><strong>{selected.actualWeightLb ? `${selected.actualWeightLb} lb` : "Pending"}</strong></div><div><span>Packages</span><strong>{selected.packageCount ?? "Pending"}</strong></div></div><h2>Chain of custody</h2>{selected.operationEvents?.length ? <ol className="timeline">{[...selected.operationEvents].reverse().map((event) => <li key={event.id}><strong>{event.label}</strong><small>{event.station ?? "Unassigned station"} · {new Intl.DateTimeFormat("en-JM", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.occurredAt))}</small><p>{event.customerVisible ? "Visible in the customer order hub" : "Internal only"}</p></li>)}</ol> : <p className="empty-state">No care events recorded yet.</p>}</>}</section><section className="card admin-panel"><h2>Append a care event</h2><p>Production events are append-only. Corrections use a new event rather than rewriting custody history.</p><div className="form-group"><label htmlFor="operation-event">Event</label><select className="select" id="operation-event" value={eventType} onChange={(event) => setEventType(event.target.value as OperationEvent["type"])}>{operationChoices.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></div><label className="check-row section-gap"><input type="checkbox" checked={customerVisible} onChange={(event) => setCustomerVisible(event.target.checked)}/><span>Show this plain-language event in the customer order hub</span></label><button className="button section-gap" type="button" disabled={!selected || !choice} onClick={() => selected && choice && appendOperationEvent(selected.id, { type: choice.value, label: choice.label, station: choice.station, customerVisible })}>Append demo event</button><div className="section-gap"><Notice tone="warning" title="Exceptions need follow-through">Damage risk, undeclared items, colour transfer, pocket contents, or failed quality checks should create a staffed exception—not disappear into a note.</Notice></div></section></div></>;
}

export function FinanceAdminPage() {
  const { orders } = useDemo();
  const knownTotal = orders.reduce((sum, order) => sum + order.estimate.knownTotalJmd, 0);
  const issuedTotal = orders.reduce((sum, order) => sum + (order.invoice?.amountJmd ?? 0), 0);
  const reviewCount = orders.filter((order) => order.paymentStatus === "REVIEW").length;
  return <><AdminHeading title="Finance & reconciliation" body="Keep estimates, invoices, proof review, payment verification, credits, and refunds as separate auditable states."/><div className="metric-grid"><Metric label="Known demo estimates" value={formatJmd(knownTotal)}/><Metric label="Demo invoices" value={formatJmd(issuedTotal)}/><Metric label="Proofs to review" value={String(reviewCount)}/><Metric label="Online checkout" value="Disabled"/></div><section className="card admin-panel"><div className="admin-table-wrap" role="region" aria-label="Invoice and payment table" tabIndex={0}><table className="admin-table"><thead><tr><th>Order</th><th>Invoice</th><th>Amount</th><th>Invoice state</th><th>Payment state</th><th>Control</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.reference}</strong><br/><small>{order.customerName}</small></td><td>{order.invoice?.invoiceNumber ?? "Not issued"}</td><td>{order.invoice ? formatJmd(order.invoice.amountJmd) : "—"}</td><td>{order.invoice?.status ?? "—"}</td><td>{order.paymentStatus}</td><td>{order.paymentStatus === "REVIEW" ? <span className="pill pill-warning">Independent review required</span> : <span className="pill">No action</span>}</td></tr>)}</tbody></table></div></section><div className="cards-3"><FinanceControl title="Daily reconciliation" body="Match verified references, amounts, methods, and bank or gateway records before closing the day."/><FinanceControl title="Credits & refunds" body="Structure prepared; production approval limits and accounting treatment require owner and accountant confirmation."/><FinanceControl title="Accounting export" body="CSV/export mapping is deferred until invoice fields, tax treatment, and destination software are approved."/></div></>;
}

export function IssuesAdminPage() {
  const { orders } = useDemo();
  const requests = orders.flatMap((order) => (order.changeRequests ?? []).map((request) => ({ ...request, order })));
  const exceptions = orders.flatMap((order) => (order.operationEvents ?? []).filter((event) => event.type === "EXCEPTION" || event.type === "REWASH").map((event) => ({ ...event, order })));
  return <><AdminHeading title="Requests & exceptions" body="One queue for reschedules, support, care exceptions, rewashes, and policy-dependent cancellations."/><div className="metric-grid"><Metric label="Open customer requests" value={String(requests.filter((item) => item.status === "PENDING").length)}/><Metric label="Care exceptions" value={String(exceptions.length)}/><Metric label="Cancellation automation" value="Blocked"/><Metric label="Claims policy" value="Draft"/></div><div className="operations-layout"><section className="card admin-panel"><h2>Customer requests</h2>{requests.length ? <div className="request-list">{requests.map((item) => <article key={item.id}><div><span className="pill">{item.type.toLowerCase().replaceAll("_", " ")}</span><strong>{item.order.reference}</strong></div><p>{item.note || "No customer note."}</p>{item.requestedDate && <small>Requested: {item.requestedDate} · {item.requestedSlot}</small>}<span className="pill pill-warning">{item.status}</span></article>)}</div> : <p className="empty-state">Submit a reschedule or support request from the customer order hub to exercise this queue.</p>}</section><section className="card admin-panel"><h2>Care exceptions and rewashes</h2>{exceptions.length ? <div className="request-list">{exceptions.map((item) => <article key={item.id}><div><span className="pill pill-warning">{item.type.toLowerCase()}</span><strong>{item.order.reference}</strong></div><p>{item.label}</p><small>{item.station} · {new Intl.DateTimeFormat("en-JM", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.occurredAt))}</small></article>)}</div> : <p className="empty-state">No demo exceptions are open. Add an exception from Care operations to test the workflow.</p>}<div className="section-gap"><Notice tone="warning" title="Legal rules stay inactive">Claims windows, liability limits, valuation, credits, refunds, and disposal rules cannot be automated until approved.</Notice></div></section></div></>;
}

export function InsightsAdminPage() {
  const { orders } = useDemo();
  const stats = useMemo(() => {
    const total = orders.length;
    const knownValue = orders.reduce((sum, order) => sum + order.estimate.knownTotalJmd, 0);
    const actionNeeded = orders.filter((order) => ["AWAITING_STUDENT_VERIFICATION", "PRICE_APPROVAL_REQUIRED", "PAYMENT_REVIEW", "RESCHEDULE_REQUESTED", "ON_HOLD"].includes(order.status)).length;
    const student = orders.filter((order) => order.studentStatus !== "NOT_APPLICABLE").length;
    return { total, knownValue, actionNeeded, student, average: total ? Math.round(knownValue / total) : 0 };
  }, [orders]);
  const byStatus = useMemo(() => Object.entries(Object.groupBy(orders, (order) => FRIENDLY_STATUS[order.status])).map(([label, items]) => ({ label, count: items?.length ?? 0 })), [orders]);
  const max = Math.max(1, ...byStatus.map((item) => item.count));
  return <><AdminHeading title="Owner insights" body="Decision-focused operational signals derived only from the labelled demo records in this browser."/><Notice title="Synthetic review data">These figures prove the dashboard behavior; they are not business performance claims. Production analytics will use an allow-list that excludes names, addresses, phone numbers, IDs, proof files, care notes, and raw order references.</Notice><div className="metric-grid section-gap"><Metric label="Demo requests" value={String(stats.total)}/><Metric label="Known estimate value" value={formatJmd(stats.knownValue)}/><Metric label="Average estimate" value={formatJmd(stats.average)}/><Metric label="Actions needed" value={String(stats.actionNeeded)}/></div><div className="operations-layout"><section className="card admin-panel"><h2>Orders by current state</h2><div className="bar-list">{byStatus.map((item) => <div key={item.label}><span>{item.label}</span><div><i style={{ width: `${(item.count / max) * 100}%` }}/></div><strong>{item.count}</strong></div>)}</div></section><section className="card admin-panel"><h2>Customer mix</h2><div className="donut-summary" style={{ "--student-share": `${stats.total ? (stats.student / stats.total) * 360 : 0}deg` } as React.CSSProperties}><div><strong>{stats.student}</strong><span>student-rate requests</span></div></div><ul className="list-check"><li>Student eligibility remains manually verified</li><li>Unknown and quote-required items are not counted as J$0 revenue</li><li>Production reporting should separate estimate, invoice, paid, refunded, and credited amounts</li></ul></section></div><section className="card admin-panel"><h2>Recommended operating KPIs</h2><div className="kpi-grid">{["Request-to-confirmation time", "Booking completion rate", "First-attempt pickup success", "On-time return rate", "Capacity utilization", "Estimate-to-final variance", "Payment review time", "Repeat rate at 30/60/90 days", "Claims and rewash rate", "Route cost per completed order"].map((label) => <div key={label}><Icon name="check"/><span>{label}</span><strong>Connect live data</strong></div>)}</div></section></>;
}

function AdminHeading({ title, body }: { title: string; body: string }) {
  return <header><div><h1>{title}</h1><p>{body}</p></div><span className="pill">DEMO DATA</span></header>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="card metric-card"><span>{label}</span><strong>{value}</strong></div>;
}

function FinanceControl({ title, body }: { title: string; body: string }) {
  return <article className="card admin-panel"><h2>{title}</h2><p>{body}</p></article>;
}
