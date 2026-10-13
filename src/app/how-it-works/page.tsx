import type { Metadata } from "next";
import Link from "next/link";
import { CTASection, Notice, PageHero, SectionHeading } from "@/components/ui";
import { Icon } from "@/components/icon";

export const metadata: Metadata = { title: "How it works" };
const steps = [
  ["Request", "Choose a sample available pickup window, service and care preferences. The website records a request—not a confirmed booking."],
  ["Staff confirms", "A team member reviews capacity and contacts you through the configured channel to confirm the handoff."],
  ["Direct handoff", "FreshFold collects the packaged laundry from you. If you are unavailable, both sides arrange another time."],
  ["Weigh & inspect", "Staff records actual weight and checks declared care needs while preserving your original estimate."],
  ["Approve changes", "If inspection raises the total, staff shares a revision and waits for your recorded approval."],
  ["Care", "FreshFold washes, dries, folds and/or irons based on the confirmed order and approved preferences."],
  ["Payment review", "Payment instructions follow the approved invoice process. Uploaded transfer proof remains under review until staff verifies it."],
  ["Return", "Staff coordinates the return handoff. Exact drop-off hours and some turnaround cases remain pending owner confirmation."]
] as const;

export default function HowItWorksPage(){return <><PageHero eyebrow="How it works" title="A clear handoff at every step." intro={<p>Laundry is personal. FreshFold keeps you informed from request to return without pretending an automated action has happened.</p>} actions={<Link href="/book" className="button">Request a pickup <Icon name="arrow"/></Link>} aside={<Notice title="Target, not guarantee">Wash, dry and fold is described as next-day; ironing as two-day. Capacity, pickup day, holidays, care needs and confirmation can change timing.</Notice>}/><section className="section section-white"><div className="shell"><SectionHeading eyebrow="The complete journey" title="Request. Confirm. Care. Return."/><div className="cards-4">{steps.map(([title,body],index)=><article className="card service-card" key={title}><span className="pill">Step {index+1}</span><h3 style={{marginTop:"1rem"}}>{title}</h3><p>{body}</p></article>)}</div></div></section><section className="section"><div className="shell split"><div><h2>Care requests are requests—not risky promises.</h2><p>You can ask for cold or warm water, gentle wash, fragrance-free products, no softener, separate washing, stain treatment, hang drying or hand washing.</p></div><div className="card" style={{padding:"2rem"}}><ul className="list-check"><li>Care labels and staff approval still apply</li><li>Preferences may affect price or turnaround</li><li>Stain removal is never guaranteed</li><li>Special-care garments should be packaged separately</li></ul></div></div></section><CTASection/></>}
