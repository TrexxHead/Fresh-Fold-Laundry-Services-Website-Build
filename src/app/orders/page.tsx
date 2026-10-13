import type { Metadata } from "next";
import { PageHero, Notice } from "@/components/ui";
import { OrderLookup } from "./order-lookup";
export const metadata:Metadata={title:"Order lookup"};
export default function OrdersPage(){return <><PageHero eyebrow="Secure order lookup" title="Find your order without exposing it." intro={<p>Production guest access will use an expiring, unguessable link or a reference plus a separate verification step—never a sequential database ID.</p>} aside={<Notice title="Review-mode examples">Try reference <strong>FF-241012-A7K</strong> or <strong>FF-241011-P2N</strong>. Only masked, customer-safe fields are displayed.</Notice>}/><section className="section section-white"><div className="shell split"><div><h2>Order reference</h2><p>Enter the human-readable reference from your confirmation summary.</p></div><OrderLookup/></div></section></>}
