"use client";

import Link from "next/link";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useDemo } from "@/context/demo-context";
import { BOOKABLE_ADDONS, IRONING_ITEMS, PAYMENT_METHODS } from "@/lib/catalogue";
import { nextAvailableDates, slotsForDate } from "@/lib/availability";
import { calculateEstimate, formatJmd } from "@/lib/pricing";
import { bookingSchema } from "@/lib/schemas";
import { publicRuntime } from "@/lib/runtime";
import type { BookingDraft, Estimate, QuantitySelection } from "@/lib/models";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";

const steps = ["Customer", "Pickup", "Service", "Payment", "Review"] as const;
const preferences = [
  "Cold-water wash", "Warm-water wash", "Gentle / delicate cycle",
  "Fragrance-free / sensitive-skin products", "No fabric softener", "Separate washing",
  "Stain-treatment request", "Hang / air dry", "Hand-wash request",
] as const;
const DRAFT_KEY = "freshfold-booking-draft-v2";
const DRAFT_LIFETIME_MS = 24 * 60 * 60 * 1000;

const initialDraft: BookingDraft = {
  fullName: "", phone: "", email: "", bookAs: "GUEST", customerCategory: "NON_STUDENT", institution: "", studentIdNumber: "",
  addressType: "HOUSE", campusOrBuilding: "", addressLine: "", community: "", landmark: "", handoffNotes: "", pickupDate: "", pickupSlot: "",
  serviceType: "WASH_FOLD", loadSize: 6, ironingItems: [], specialItems: [], preferences: [], specialInstructions: "",
  paymentPreference: "CASH", referralSource: "", termsAccepted: false, careAcknowledged: false, requestAcknowledged: false,
};

interface SubmittedBooking {
  customerName: string;
  reference: string;
  pickupDate: string;
  pickupSlot: string;
  location: string;
  estimate: Estimate;
  accessToken?: string;
  accessExpiresAt?: string;
}

function quantityFor(items: QuantitySelection[], itemId: string) {
  return items.find((item) => item.itemId === itemId)?.quantity ?? 0;
}

function withQuantity(items: QuantitySelection[], itemId: string, quantity: number) {
  return [...items.filter((item) => item.itemId !== itemId), { itemId, quantity }].filter((item) => item.quantity > 0);
}

function restoreDraft(): BookingDraft | null {
  try {
    const value = localStorage.getItem(DRAFT_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as { savedAt?: number; draft?: BookingDraft };
    if (!parsed.savedAt || !parsed.draft || Date.now() - parsed.savedAt > DRAFT_LIFETIME_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return { ...initialDraft, ...parsed.draft };
  } catch {
    localStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

function fieldErrorsForStep(step: number, draft: BookingDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 0) {
    if (draft.fullName.trim().length < 2) errors.fullName = "Enter your full name.";
    if (!draft.phone.trim()) errors.phone = "Enter a mobile or WhatsApp number.";
    if (!draft.email.includes("@")) errors.email = "Enter a valid email.";
    if (draft.customerCategory === "STUDENT" && !draft.institution?.trim()) errors.institution = "Enter your institution.";
  }
  if (step === 1) {
    if (draft.addressLine.trim().length < 5) errors.addressLine = "Enter the pickup address.";
    if (draft.community.trim().length < 2) errors.community = "Enter a Kingston community or area.";
    if (!draft.pickupDate) errors.pickupDate = "Choose a pickup date.";
    if (!draft.pickupSlot) errors.pickupSlot = "Choose an available pickup window.";
  }
  if (step === 2 && draft.serviceType !== "IRONING" && !draft.loadSize) errors.loadSize = "Choose a load size.";
  return errors;
}

export function BookingWizard() {
  const { submitBooking, orders, ready } = useDemo();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<BookingDraft>(initialDraft);
  const [submitted, setSubmitted] = useState<SubmittedBooking | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [restored, setRestored] = useState<"draft" | "repeat" | null>(null);
  const [copied, setCopied] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const idempotencyKey = useRef<string>("");
  const restorationDone = useRef(false);
  const dates = useMemo(() => nextAvailableDates(new Date(), 10), []);
  const estimate = useMemo(() => calculateEstimate({
    customerCategory: draft.customerCategory,
    studentVerified: false,
    serviceType: draft.serviceType,
    loadSize: draft.loadSize,
    items: [...draft.ironingItems, ...draft.specialItems],
  }), [draft.customerCategory, draft.serviceType, draft.loadSize, draft.ironingItems, draft.specialItems]);

  useEffect(() => {
    if (!ready) return;
    if (restorationDone.current) return;
    restorationDone.current = true;
    const repeatReference = new URLSearchParams(window.location.search).get("repeat");
    const prior = publicRuntime.isReview && repeatReference
      ? orders.find((order) => order.reference.toLowerCase() === repeatReference.toLowerCase())
      : undefined;
    const saved = restoreDraft();
    const timer = window.setTimeout(() => {
      if (prior) {
        setDraft({
          ...initialDraft,
          fullName: prior.customerName,
          customerCategory: prior.studentStatus === "NOT_APPLICABLE" ? "NON_STUDENT" : "STUDENT",
          community: prior.location,
          serviceType: prior.serviceType ?? "WASH_FOLD",
          loadSize: prior.loadSize ?? 6,
          preferences: prior.carePreferences ?? [],
        });
        setRestored("repeat");
      } else if (saved) {
        setDraft(saved);
        setRestored("draft");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [orders, ready]);

  useEffect(() => {
    if (submitted) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), draft }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draft, submitted]);

  useEffect(() => {
    if (Object.keys(errors).length > 0) errorSummaryRef.current?.focus();
  }, [errors]);

  const update = <K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
  };

  const moveToStep = (nextStep: number) => {
    setStep(nextStep);
    setErrors({});
    window.setTimeout(() => document.querySelector<HTMLElement>("#step-heading")?.focus(), 0);
  };

  const next = () => {
    const nextErrors = fieldErrorsForStep(step, draft);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    moveToStep(Math.min(step + 1, 4));
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraft(initialDraft);
    setStep(0);
    setErrors({});
    setRestored(null);
  };

  const finalSubmit = async () => {
    if (submitting) return;
    const parsed = bookingSchema.safeParse(draft);
    if (!parsed.success) {
      const issueMap: Record<string, string> = {};
      for (const issue of parsed.error.issues) issueMap[String(issue.path[0] ?? "form")] = issue.message;
      setErrors(issueMap);
      setStep(4);
      return;
    }
    setSubmitting(true);
    setSubmissionError("");
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    try {
      if (publicRuntime.isReview) {
        const order = submitBooking(parsed.data, idempotencyKey.current);
        setSubmitted({ customerName: order.customerName, reference: order.reference, pickupDate: order.pickupDate, pickupSlot: order.pickupSlot, location: order.location, estimate: order.estimate });
      } else {
        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft: parsed.data, idempotencyKey: idempotencyKey.current }),
        });
        const payload = await response.json() as { ok?: boolean; message?: string; receipt?: { reference: string; accessToken: string; accessExpiresAt: string } };
        if (!response.ok || !payload.receipt) throw new Error(payload.message || "The request could not be saved.");
        setSubmitted({ customerName: parsed.data.fullName, reference: payload.receipt.reference, pickupDate: parsed.data.pickupDate, pickupSlot: parsed.data.pickupSlot, location: parsed.data.campusOrBuilding || parsed.data.community, estimate, accessToken: payload.receipt.accessToken, accessExpiresAt: payload.receipt.accessExpiresAt });
      }
      localStorage.removeItem(DRAFT_KEY);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "The request could not be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyReference = async () => {
    if (!submitted) return;
    await navigator.clipboard.writeText(submitted.reference);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const saveCalendarRequest = () => {
    if (!submitted) return;
    const day = submitted.pickupDate.replaceAll("-", "");
    const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FreshFold//Pickup Request//EN", "BEGIN:VEVENT", `UID:${submitted.reference}@freshfold.local`, `DTSTART;VALUE=DATE:${day}`, `SUMMARY:FreshFold pickup request ${submitted.reference}`, `DESCRIPTION:Requested window: ${submitted.pickupSlot}. This is not confirmed until FreshFold contacts you.`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${submitted.reference}-pickup-request.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (submitted) {
    const lookupHref = submitted.accessToken ? `/orders?reference=${encodeURIComponent(submitted.reference)}&token=${encodeURIComponent(submitted.accessToken)}` : "/orders";
    return <div className="booking-shell"><div className="shell"><section className="card success-panel" aria-live="polite">
      <div className="icon-tile"><Icon name="check" size={28}/></div>
      <p className="eyebrow">{publicRuntime.isReview ? "Demo request saved" : "Request received"}</p>
      <h1>Thanks, {submitted.customerName.split(" ")[0]}.</h1>
      <p>{publicRuntime.isReview ? "This clearly labelled demo request is available throughout the FreshFold review experience. No FreshFold team member was contacted, and no external message or payment was sent." : "FreshFold will review capacity and contact you before the pickup is confirmed."}</p>
      <p className="reference">{submitted.reference}</p>
      <div className="confirmation-tools" aria-label="Request tools"><button className="button button-secondary button-small" type="button" onClick={() => void copyReference()}>{copied ? "Copied" : "Copy reference"}</button><button className="button button-secondary button-small" type="button" onClick={saveCalendarRequest}>Add request to calendar</button><button className="button button-secondary button-small" type="button" onClick={() => window.print()}>Print / save</button></div>
      <div className="confirmation-summary"><Notice title="What happens next">FreshFold reviews the request, verifies student status if applicable and confirms the direct handoff. A visible window is still a request until staff confirms it.</Notice><div className="summary-line"><span>Pickup request</span><strong>{submitted.pickupDate}<small>{submitted.pickupSlot}</small></strong></div><div className="summary-line"><span>Location</span><strong>{submitted.location}</strong></div><div className="summary-total"><span>Estimated total</span><strong>{formatJmd(submitted.estimate.knownTotalJmd)}{submitted.estimate.provisional ? "*" : ""}</strong></div><p className="fine-print">* Actual weight, verification, quoted care items and inspection may change the amount. A higher revised amount requires approval.</p></div>
      <div className="hero-actions centered-actions"><Link className="button" href={lookupHref}>Open order hub <Icon name="arrow"/></Link><Link className="button button-secondary" href="/contact">Get help</Link><button className="button button-secondary" type="button" onClick={() => { setSubmitted(null); idempotencyKey.current = ""; discardDraft(); }}>Start another request</button></div>
      {submitted.accessExpiresAt && <p className="fine-print">For privacy, this guest access link expires on {new Intl.DateTimeFormat("en-JM", { dateStyle: "medium" }).format(new Date(submitted.accessExpiresAt))}.</p>}
    </section></div></div>;
  }

  return <div className="booking-shell"><div className="shell">
    <header className="booking-header"><div><p className="eyebrow">Pickup request</p><h1 id="booking-heading">Book a pickup</h1><p>About 4–6 minutes · Guest booking available · No payment collected</p></div><span className="pill" aria-label={`Step ${step + 1} of ${steps.length}: ${steps[step]}`}>Step {step + 1} of {steps.length} · {steps[step]}</span></header>
    {restored && <div className="draft-restored"><Notice title={restored === "repeat" ? "Safe details copied" : "Draft restored"}>{restored === "repeat" ? "Service, load, location label, and care preferences were copied. Re-enter the address, schedule, contact, payment, and consent details." : "Your non-file booking details were restored on this device. Drafts expire after 24 hours."}</Notice><button className="inline-button" type="button" onClick={discardDraft}>{restored === "repeat" ? "Clear copied details" : "Discard draft"}</button></div>}
    <div className="booking-layout"><form className="card wizard-card" onSubmit={(event) => { event.preventDefault(); void finalSubmit(); }} noValidate>
      <ol className="wizard-progress" aria-label="Booking progress">{steps.map((label, index) => <li key={label} className={index === step ? "active" : index < step ? "complete" : ""} aria-current={index === step ? "step" : undefined}><span aria-hidden="true">{index < step ? "✓" : index + 1}</span><span className="progress-label">{label}</span></li>)}</ol>
      {Object.keys(errors).length > 0 && <ErrorSummary ref={errorSummaryRef} errors={errors}/>}
      {submissionError && <div className="submission-error"><Notice tone="warning" title="Request not saved">{submissionError} Your details remain here so you can try again.</Notice></div>}

      {step === 0 && <CustomerStep draft={draft} errors={errors} update={update}/>}
      {step === 1 && <PickupStep draft={draft} errors={errors} dates={dates} update={update}/>}
      {step === 2 && <ServiceStep draft={draft} errors={errors} update={update}/>}
      {step === 3 && <PaymentStep draft={draft} update={update}/>}
      {step === 4 && <ReviewStep draft={draft} errors={errors} update={update}/>}

      <div className="wizard-actions">{step > 0 ? <button type="button" className="button button-secondary" onClick={() => moveToStep(step - 1)}>Back</button> : <span/>}{step < 4 ? <button type="button" className="button" onClick={next}>Continue <Icon name="arrow"/></button> : <button type="submit" className="button" disabled={submitting} aria-busy={submitting}>{submitting ? "Saving request…" : submissionError ? "Try again" : "Submit request"} <Icon name="arrow"/></button>}</div>
    </form><EstimateSummary draft={draft} estimate={estimate}/></div>
  </div></div>;
}

type UpdateDraft = <K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) => void;

function CustomerStep({ draft, errors, update }: { draft: BookingDraft; errors: Record<string, string>; update: UpdateDraft }) {
  return <section className="wizard-step" aria-labelledby="step-heading"><h2 id="step-heading" tabIndex={-1}>Who are we collecting from?</h2><p>Guest booking is always available. Student rates remain provisional until staff verifies current eligibility.</p><div className="form-grid">
    <div className="form-group full"><span className="field-label">Booking option</span><div className="choice-grid two-column"><Choice id="as-guest" name="bookAs" checked={draft.bookAs === "GUEST"} onChange={() => update("bookAs", "GUEST")} title="Continue as guest" detail="No account required"/><Choice id="as-account" name="bookAs" checked={draft.bookAs === "ACCOUNT"} onChange={() => update("bookAs", "ACCOUNT")} title="Create / use account" detail={publicRuntime.isReview ? "Preview the account journey" : "Save details and order history"}/></div></div>
    <Field id="fullName" label="Full name" value={draft.fullName} onChange={(value) => update("fullName", value)} error={errors.fullName} autoComplete="name"/><Field id="phone" label="Mobile / WhatsApp number" type="tel" value={draft.phone} onChange={(value) => update("phone", value)} error={errors.phone} hint="Jamaican 876/658 or international format." autoComplete="tel"/>
    <div className="form-group full"><Field id="email" label="Email" type="email" value={draft.email} onChange={(value) => update("email", value)} error={errors.email} hint="Used for the request record and service updates; never for marketing without separate permission." autoComplete="email"/></div>
    <div className="form-group full"><span className="field-label">Customer category</span><div className="choice-grid two-column"><Choice id="nonstudent" name="category" checked={draft.customerCategory === "NON_STUDENT"} onChange={() => update("customerCategory", "NON_STUDENT")} title="Non-student" detail="Standard rates"/><Choice id="student" name="category" checked={draft.customerCategory === "STUDENT"} onChange={() => update("customerCategory", "STUDENT")} title="Student" detail="Eligibility review required"/></div></div>
    {draft.customerCategory === "STUDENT" && <><Field id="institution" label="Institution" value={draft.institution ?? ""} onChange={(value) => update("institution", value)} error={errors.institution} placeholder="e.g. UWI, UTech or other"/><Field id="studentIdNumber" label="Student ID number (optional in review)" value={draft.studentIdNumber ?? ""} onChange={(value) => update("studentIdNumber", value)} hint="Production will minimize collected ID data and request evidence only through private storage."/><div className="form-group full"><label htmlFor="student-id-file">Current student ID evidence</label><input className="input" id="student-id-file" type="file" accept="image/jpeg,image/png,application/pdf" disabled={!publicRuntime.isReview}/><span className="field-hint">{publicRuntime.isReview ? "Demo picker only: the file is not uploaded or retained." : "Secure upload activates only when private storage and malware scanning are available."}</span></div></>}
  </div></section>;
}

function PickupStep({ draft, errors, dates, update }: { draft: BookingDraft; errors: Record<string, string>; dates: string[]; update: UpdateDraft }) {
  return <section className="wizard-step" aria-labelledby="step-heading"><h2 id="step-heading" tabIndex={-1}>Where and when?</h2><p>FreshFold considers Kingston requests operationally. A time remains provisional until capacity is confirmed.</p><div className="form-grid">
    <div className="form-group full"><label htmlFor="addressType">Address type</label><select className="select" id="addressType" value={draft.addressType} onChange={(event) => update("addressType", event.target.value as BookingDraft["addressType"])}><option value="CAMPUS">Campus hall / residence</option><option value="APARTMENT">Apartment</option><option value="HOUSE">House</option><option value="OTHER">Other</option></select></div>
    {draft.addressType === "CAMPUS" && <div className="form-group full"><Field id="campusOrBuilding" label="Institution, campus and hall / building" value={draft.campusOrBuilding ?? ""} onChange={(value) => update("campusOrBuilding", value)}/></div>}
    <div className="form-group full"><Field id="addressLine" label="Kingston address line" value={draft.addressLine} onChange={(value) => update("addressLine", value)} error={errors.addressLine} autoComplete="street-address"/></div><Field id="community" label="Community / area" value={draft.community} onChange={(value) => update("community", value)} error={errors.community}/><Field id="landmark" label="Nearby landmark (optional)" value={draft.landmark ?? ""} onChange={(value) => update("landmark", value)}/>
    {draft.community.trim().length >= 2 && <div className="form-group full"><div className="serviceability-result" role="status"><Icon name="location" size={20}/><div><strong>Kingston serviceability review available</strong><span>FreshFold will assess {draft.community.trim()} with the address and requested window. No location fee or automatic confirmation is implied.</span></div></div></div>}
    <div className="form-group full"><label htmlFor="handoffNotes">Handoff / access instructions (optional)</label><textarea className="textarea" id="handoffNotes" value={draft.handoffNotes} maxLength={500} onChange={(event) => update("handoffNotes", event.target.value)}/><span className="field-hint">Direct handoff only. Do not leave laundry unattended by default.</span></div>
    <SelectField id="pickupDate" label="Pickup date" value={draft.pickupDate} error={errors.pickupDate} onChange={(value) => { update("pickupDate", value); update("pickupSlot", ""); }}><option value="">Choose date</option>{dates.map((date) => <option key={date} value={date}>{new Intl.DateTimeFormat("en-JM", { weekday: "long", month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`))}</option>)}</SelectField><SelectField id="pickupSlot" label="Pickup window" value={draft.pickupSlot} error={errors.pickupSlot} disabled={!draft.pickupDate} onChange={(value) => update("pickupSlot", value)}><option value="">Choose window</option>{slotsForDate(draft.pickupDate).map((slot) => <option key={slot} value={slot}>{slot}</option>)}</SelectField>
  </div><div className="section-gap"><Notice title="A request, not a reservation">Staff confirms live capacity and pickup details. Evening windows are not offered on Saturdays. If the selected window fills, the order hub will offer the nearest alternatives.</Notice></div></section>;
}

function ServiceStep({ draft, errors, update }: { draft: BookingDraft; errors: Record<string, string>; update: UpdateDraft }) {
  return <section className="wizard-step" aria-labelledby="step-heading"><h2 id="step-heading" tabIndex={-1}>What care do you need?</h2><p>Actual weight, garment condition and care needs are confirmed after the direct handoff.</p>
    <div className="form-group"><span className="field-label">Service type</span><div className="choice-grid">{([['WASH_FOLD', 'Wash, dry & fold', 'Next-day target'], ['IRONING', 'Ironing only', 'Two-day target'], ['WASH_AND_IRON', 'Wash + ironing', 'Two-day ironing target']] as const).map(([value, title, detail]) => <Choice key={value} id={value} name="service" checked={draft.serviceType === value} onChange={() => update("serviceType", value)} title={title} detail={detail}/>)}</div></div>
    {draft.serviceType !== "IRONING" && <div className="form-group section-gap"><span className="field-label">Load package</span><div className="choice-grid">{([6, 9, 12] as const).map((size) => <Choice key={size} id={`load-${size}`} name="loadSize" checked={draft.loadSize === size} onChange={() => update("loadSize", size)} title={`${size} lb`} detail={formatJmd(draft.customerCategory === "STUDENT" ? ({ 6: 850, 9: 1200, 12: 1550 } as const)[size] : ({ 6: 1300, 9: 1750, 12: 2250 } as const)[size])}/>)}</div>{errors.loadSize && <span className="field-error">{errors.loadSize}</span>}</div>}
    {draft.serviceType !== "WASH_FOLD" && <QuantityGroup title="Ironing items" items={IRONING_ITEMS} selections={draft.ironingItems} onChange={(value) => update("ironingItems", value)}/>}<QuantityGroup title="Special care & add-ons" items={BOOKABLE_ADDONS} selections={draft.specialItems} onChange={(value) => update("specialItems", value)}/>
    <fieldset className="plain-fieldset"><legend className="field-label">Care preferences</legend><p className="field-hint">Requests remain subject to care labels, staff approval, price and capacity.</p><div className="check-list">{preferences.map((preference) => <label className="check-row" key={preference}><input type="checkbox" checked={draft.preferences.includes(preference)} onChange={(event) => update("preferences", event.target.checked ? [...draft.preferences, preference] : draft.preferences.filter((value) => value !== preference))}/><span>{preference}</span></label>)}</div></fieldset>
    <div className="form-group"><label htmlFor="specialInstructions">Other special instructions</label><textarea className="textarea" id="specialInstructions" value={draft.specialInstructions} maxLength={1000} onChange={(event) => update("specialInstructions", event.target.value)}/></div><div className="form-group section-gap"><label htmlFor="care-photo">Optional stain / care photo</label><input className="input" id="care-photo" type="file" accept="image/jpeg,image/png" disabled={!publicRuntime.isReview}/><span className="field-hint">{publicRuntime.isReview ? "Demo picker only: no file is uploaded or retained. Stain removal is never guaranteed." : "Private upload activates only when scanning is available."}</span></div>
  </section>;
}

function PaymentStep({ draft, update }: { draft: BookingDraft; update: UpdateDraft }) {
  return <section className="wizard-step" aria-labelledby="step-heading"><h2 id="step-heading" tabIndex={-1}>How would you prefer to pay?</h2><p>This request does not collect payment. Staff weighs and inspects first, then provides the confirmed invoice and approved instructions.</p><div className="choice-grid">{PAYMENT_METHODS.filter((method) => method.enabled).map((method) => <Choice key={method.value} id={`pay-${method.value}`} name="payment" checked={draft.paymentPreference === method.value} onChange={() => update("paymentPreference", method.value as BookingDraft["paymentPreference"])} title={method.label} detail="Preference only"/>)}</div><div className="section-gap"><Notice title="No card or banking details here">Bank-transfer proof belongs only in the private order record. Uploading proof changes the order to payment review; only authorised staff can mark it paid.</Notice></div></section>;
}

function ReviewStep({ draft, errors, update }: { draft: BookingDraft; errors: Record<string, string>; update: UpdateDraft }) {
  return <section className="wizard-step" aria-labelledby="step-heading"><h2 id="step-heading" tabIndex={-1}>Review and consent</h2><p>Check the request and acknowledge how estimate, care and confirmation work.</p><div className="summary-line"><span>Customer</span><strong>{draft.fullName || "Not entered"}<small>{draft.customerCategory === "STUDENT" ? "Student estimate — verification pending" : "Non-student"}</small></strong></div><div className="summary-line"><span>Pickup request</span><strong>{draft.pickupDate || "Not chosen"}<small>{draft.pickupSlot || "No window chosen"}</small></strong></div><div className="summary-line"><span>Service</span><strong>{draft.serviceType.replaceAll("_", " ").toLowerCase()}<small>{draft.loadSize ? `${draft.loadSize} lb package` : ""}</small></strong></div><div className="form-group section-gap"><label htmlFor="referralSource">How did you hear about FreshFold? (optional)</label><input className="input" id="referralSource" value={draft.referralSource} maxLength={100} onChange={(event) => update("referralSource", event.target.value)}/></div><div className="section-gap"><ConsentCheck id="termsAccepted" checked={draft.termsAccepted} onChange={(value) => update("termsAccepted", value)} error={errors.termsAccepted}>I agree to the <Link href="/terms" target="_blank">{publicRuntime.isReview ? "draft Terms v0.1" : "current Terms"}</Link> for this request.</ConsentCheck><ConsentCheck id="careAcknowledged" checked={draft.careAcknowledged} onChange={(value) => update("careAcknowledged", value)} error={errors.careAcknowledged}>I emptied all pockets and declared special-care items, which I will package separately.</ConsentCheck><ConsentCheck id="requestAcknowledged" checked={draft.requestAcknowledged} onChange={(value) => update("requestAcknowledged", value)} error={errors.requestAcknowledged}>I understand this is a request pending staff confirmation, not a confirmed pickup.</ConsentCheck></div></section>;
}

const ErrorSummary = forwardRef<HTMLDivElement, { errors: Record<string, string> }>(function ErrorSummary({ errors }, ref) {
  return <div className="error-summary" role="alert" tabIndex={-1} ref={ref}><strong>Check {Object.keys(errors).length === 1 ? "this detail" : "these details"}</strong><ul>{Object.entries(errors).map(([field, message]) => <li key={field}><a href={`#${field}`} onClick={() => window.setTimeout(() => document.getElementById(field)?.focus(), 0)}>{message}</a></li>)}</ul></div>;
});

function Choice({ id, name, checked, onChange, title, detail }: { id: string; name: string; checked: boolean; onChange: () => void; title: string; detail: string }) {
  return <div className="choice"><input id={id} type="radio" name={name} checked={checked} onChange={onChange}/><label htmlFor={id}><strong>{title}</strong><small>{detail}</small></label></div>;
}

function Field({ id, label, value, onChange, type = "text", error, hint, ...props }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; error?: string; hint?: string; placeholder?: string; autoComplete?: string }) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <div className="form-group"><label htmlFor={id}>{label}</label><input className="input" id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props}/>{hint && <span className="field-hint" id={`${id}-hint`}>{hint}</span>}{error && <span className="field-error" id={`${id}-error`}>{error}</span>}</div>;
}

function SelectField({ id, label, value, onChange, error, disabled, children }: { id: string; label: string; value: string; onChange: (value: string) => void; error?: string; disabled?: boolean; children: React.ReactNode }) {
  return <div className="form-group"><label htmlFor={id}>{label}</label><select className="select" id={id} value={value} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{children}</select>{error && <span className="field-error" id={`${id}-error`}>{error}</span>}</div>;
}

function ConsentCheck({ id, checked, onChange, error, children }: { id: string; checked: boolean; onChange: (value: boolean) => void; error?: string; children: React.ReactNode }) {
  return <label className="check-row" htmlFor={id}><input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}/><span>{children}{error && <span className="field-error" id={`${id}-error`}>{error}</span>}</span></label>;
}

function QuantityGroup({ title, items, selections, onChange }: { title: string; items: typeof BOOKABLE_ADDONS; selections: QuantitySelection[]; onChange: (value: QuantitySelection[]) => void }) {
  return <fieldset className="plain-fieldset"><legend className="field-label">{title}</legend><div className="quantity-grid">{items.map((item) => <div className="quantity-row" key={item.id}><label htmlFor={`quantity-${item.id}`}><strong>{item.shortName}</strong><small>{item.amountJmd === null ? "Staff quote" : `${item.pricingType === "STARTING_AT" ? "Starting at " : ""}${formatJmd(item.amountJmd)}${item.unitLabel ? ` / ${item.unitLabel}` : ""}`}</small></label><input className="input" id={`quantity-${item.id}`} type="number" min={0} max={40} inputMode="numeric" value={quantityFor(selections, item.id)} onChange={(event) => onChange(withQuantity(selections, item.id, Math.max(0, Number.parseInt(event.target.value || "0", 10))))}/></div>)}</div></fieldset>;
}

function EstimateSummary({ draft, estimate }: { draft: BookingDraft; estimate: Estimate }) {
  const [open, setOpen] = useState(true);
  return <aside className={`card order-summary ${open ? "is-open" : "is-collapsed"}`} aria-live="polite"><div className="summary-heading"><div><p className="eyebrow">Live estimate</p><h2>Order summary</h2></div><button className="summary-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="estimate-details">{open ? "Hide details" : "Show details"}</button></div><div id="estimate-details" hidden={!open}>{estimate.lines.length === 0 ? <p className="summary-empty">Choose a service to build the estimate.</p> : estimate.lines.map((line) => <div className="summary-line" key={line.id}><span>{line.label}<small>{line.quantity > 1 ? `Quantity ${line.quantity}` : ""}{line.requiresReview ? " · Review needed" : ""}</small></span><strong>{line.amountJmd === null ? "Quote" : formatJmd(line.amountJmd)}</strong></div>)}</div><div className="summary-total"><span><strong>Estimated total</strong><small>Known-price items</small></span><strong>{formatJmd(estimate.knownTotalJmd)}{estimate.provisional ? "*" : ""}</strong></div>{draft.customerCategory === "STUDENT" && <span className="pill pill-warning">Provisional student rate</span>}{open && <p className="fine-print section-gap">* Inspection, verification, actual weight and quoted items may change the final amount. This is not an invoice.</p>}</aside>;
}
