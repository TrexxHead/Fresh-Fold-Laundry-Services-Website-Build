import type { Metadata } from "next";
import { PageHero, CTASection } from "@/components/ui";
const faqs=[
  ["Who can book FreshFold?","Anyone in the Kingston service area can request a pickup. Student rates require a current student ID and manual staff approval."],
  ["Is my pickup confirmed when I submit?","No. The website records a request. A FreshFold team member reviews the details and contacts you to confirm the pickup."],
  ["What happens if my bag is heavier than the package?","Staff weighs and inspects it after pickup. Because no excess-weight rate is confirmed, staff must propose a revised price with a reason and receive your approval before processing if the amount increases."],
  ["Can you handle delicate or special-care garments?","You can declare them and package them separately. Staff confirms whether FreshFold can accept the item, the care method, price and turnaround. Stain removal is not guaranteed."],
  ["How does pickup work?","Pickup is a direct handoff. Do not leave laundry unattended or with security unless FreshFold explicitly arranges that with you."],
  ["When do I pay?","Booking collects only a preferred payment method. Staff weighs and inspects, then issues or records an invoice under the approved process. Transfer proof is reviewed manually and does not mark an order paid."],
  ["How fast is the service?","The source describes next-day wash/dry/fold and two-day ironing targets. These are not guarantees and depend on capacity, pickup day, holidays, special handling and staff confirmation."],
  ["Can I reschedule?","Contact FreshFold. Missed handoffs can move to the next available slot. The exact cancellation cutoff and charge basis still need owner and legal approval."],
  ["How do I report a concern?","Use the approved business contact channel. The draft source mentions a 24-hour claims window, but the complete Terms still require Jamaican legal review."],
  ["Where do you operate?","Across Kingston, including campus halls, student residences, apartments and houses. Locations are assessed operationally; no confirmed location-based fee is currently listed."]
] as const;
export const metadata:Metadata={title:"Frequently asked questions"};
export default function FAQPage(){return <><PageHero eyebrow="FAQ" title="The useful details, before the handoff." intro={<p>Answers are based on confirmed operating facts. Where a policy is still unresolved, we say so plainly.</p>}/><section className="section section-white"><div className="shell faq-list">{faqs.map(([q,a])=><details key={q}><summary>{q}</summary><div>{a}</div></details>)}</div></section><CTASection/></>}
