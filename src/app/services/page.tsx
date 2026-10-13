import type { Metadata } from "next";
import Link from "next/link";
import { CTASection, Notice, PageHero, SectionHeading } from "@/components/ui";
import { Icon } from "@/components/icon";
import { BOOKABLE_ADDONS, IRONING_ITEMS, LOAD_PRICES } from "@/lib/catalogue";
import { formatJmd } from "@/lib/pricing";

export const metadata: Metadata = { title: "Services & pricing", description: "FreshFold load, ironing and special-care estimates in Jamaican dollars." };

export default function ServicesPage() {
  return <>
    <PageHero eyebrow="Services & pricing" title="Clear starting prices. Human confirmation." intro={<p>Pick the care you need and see an itemised estimate. We label every amount as fixed, starting at or requiring a staff quote.</p>} actions={<Link className="button" href="/book">Build your estimate <Icon name="arrow"/></Link>} aside={<div className="card" style={{padding:"2rem"}}><span className="pill">What is included</span><h3 style={{marginTop:"1rem"}}>Standard wash, dry & fold</h3><p>Described by the owner as including detergent, fabric softener, packaging, pickup and delivery. Preferences and exceptions are confirmed by staff.</p><p className="fine-print">Not dry cleaning. Exact “Wash Only” naming remains a launch decision.</p></div>}/>
    <section className="section section-white"><div className="shell">
      <SectionHeading eyebrow="Fixed load packages" title="Student and non-student estimates" body="Student prices apply only after staff verifies a current student ID. Packages above 12 lb are reviewed manually; no excess rate has been invented."/>
      <div className="price-table-wrap" role="region" aria-label="Wash, dry and fold prices; scroll horizontally to see all columns" tabIndex={0}>
        <table className="price-table"><caption>Wash, dry & fold package estimates</caption><thead><tr><th scope="col">Customer category</th><th scope="col">6 lb</th><th scope="col">9 lb</th><th scope="col">12 lb</th></tr></thead><tbody><tr><th scope="row">Verified student</th>{([6,9,12] as const).map((size)=><td key={size}><strong>{formatJmd(LOAD_PRICES.STUDENT[size])}</strong></td>)}</tr><tr><th scope="row">Non-student</th>{([6,9,12] as const).map((size)=><td key={size}><strong>{formatJmd(LOAD_PRICES.NON_STUDENT[size])}</strong></td>)}</tr></tbody></table>
      </div>
      <div style={{marginTop:"1rem"}}><Notice tone="warning" title="Over 12 lb or over the selected package?">Staff weighs the bag, proposes an auditable adjustment with a reason and waits for customer approval if the total increases.</Notice></div>
    </div></section>
    <section className="section"><div className="shell">
      <SectionHeading eyebrow="Ironing" title="A sharper finish, item by item" body="Ironing-only and wash-plus-ironing orders have a two-day target description, subject to capacity, holidays, special handling and staff confirmation."/>
      <div className="price-table-wrap" role="region" aria-label="Ironing prices; scroll horizontally to see all columns" tabIndex={0}>
        <table className="price-table"><caption>Ironing estimates</caption><thead><tr><th scope="col">Item</th><th scope="col">Estimate</th><th scope="col">Pricing note</th></tr></thead><tbody>{IRONING_ITEMS.map((item)=><tr key={item.id}><th scope="row">{item.name}</th><td><strong>{item.pricingType === "STARTING_AT" ? "Starting at " : ""}{formatJmd(item.amountJmd ?? 0)}</strong> / item</td><td>{item.note}</td></tr>)}</tbody></table>
      </div>
    </div></section>
    <section className="section section-soft"><div className="shell"><SectionHeading eyebrow="Special care & add-ons" title="Visible amounts, visible unknowns" body="Several legacy amounts have unresolved units. Those items are collected as quote requests so J$0 is never mistaken for free."/><div className="cards-3">{BOOKABLE_ADDONS.map((item)=><article className="card price-card" key={item.id}><span className={`pill ${item.pricingType === "QUOTE_REQUIRED" ? "pill-warning" : ""}`}>{item.pricingType === "QUOTE_REQUIRED" ? "Staff quote" : item.pricingType.replaceAll("_"," ").toLowerCase()}</span><h3>{item.name}</h3><p className="price">{item.amountJmd === null ? "Quote" : `${item.pricingType === "STARTING_AT" ? "from " : ""}${formatJmd(item.amountJmd)}`}</p><p>{item.note}</p></article>)}</div></div></section>
    <CTASection/>
  </>;
}
