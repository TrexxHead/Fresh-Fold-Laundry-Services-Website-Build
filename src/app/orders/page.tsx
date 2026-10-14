import type { Metadata } from "next";
import { PageHero, Notice } from "@/components/ui";
import { OrderLookup } from "./order-lookup";
export const metadata:Metadata={title:"Order lookup"};
export default function OrdersPage(){return <><PageHero eyebrow="Private order hub" title="See progress. Make decisions. Stay in control." intro={<p>Use a secure guest link or account to follow the customer-safe order timeline, review a revised price, request another window, and get help.</p>} aside={<Notice title="Review-mode examples">Try <strong>FF-241012-M4R</strong> for price approval, <strong>FF-241011-P2N</strong> for payment review, or <strong>FF-241012-A7K</strong> for student verification.</Notice>}/><section className="section section-white"><div className="shell"><OrderLookup/></div></section></>}
