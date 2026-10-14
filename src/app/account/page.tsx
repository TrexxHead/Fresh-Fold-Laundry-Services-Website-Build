import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { PageHero, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Customer account" };

export default function AccountPage() {
  return <><PageHero eyebrow="Optional customer account" title="Your orders, with less repetition." intro={<p>Save approved contact details and care preferences, see customer-safe history, and make decisions without giving up guest booking.</p>} aside={<Notice title="Guest access always remains available">An account is a convenience, not a requirement. Secure guest links expire automatically and reveal only one customer-safe order.</Notice>}/><section className="section section-white"><div className="shell split"><div><h2>Designed for useful self-service</h2><ul className="list-check"><li>Order history and one-tap repeat requests</li><li>Saved details and care preferences with consent</li><li>Live status and price approvals</li><li>Invoices, receipts, messages, and help requests</li><li>Private, short-lived access to authorised uploads</li></ul><p className="fine-print">Marketing permission stays separate from operational service updates.</p></div><AuthForm audience="customer" nextPath="/account"/></div></section></>;
}
