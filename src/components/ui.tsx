import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";
import { MotionCard, Reveal } from "./motion-system";
import { publicRuntime } from "@/lib/runtime";

export function PageHero({ eyebrow, title, intro, actions, aside }: { eyebrow: string; title: ReactNode; intro: ReactNode; actions?: ReactNode; aside?: ReactNode }) {
  return <section className="page-hero"><div className="shell hero-grid"><Reveal className="hero-copy"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><div className="hero-intro">{intro}</div>{actions && <div className="hero-actions">{actions}</div>}</Reveal>{aside && <Reveal className="hero-aside" delay={.08}>{aside}</Reveal>}</div></section>;
}

export function SectionHeading({ eyebrow, title, body, align = "left" }: { eyebrow?: string; title: string; body?: string; align?: "left" | "center" }) {
  return <Reveal className={`section-heading align-${align}`}><header>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{body && <p>{body}</p>}</header></Reveal>;
}

export function ServiceCard({ icon, eyebrow, title, children, href }: { icon: IconName; eyebrow: string; title: string; children: ReactNode; href?: string }) {
  return <MotionCard className="card service-card"><div className="icon-tile"><Icon name={icon} size={24}/></div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3><div>{children}</div>{href && <Link className="text-link" href={href}>Learn more <Icon name="arrow" size={16}/></Link>}</MotionCard>;
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warning" | "success"; title: string; children: ReactNode }) {
  return <div className={`notice notice-${tone}`} role={tone === "warning" ? "alert" : "note"}><Icon name={tone === "warning" ? "warning" : tone === "success" ? "check" : "shield"}/><div><strong>{title}</strong><div>{children}</div></div></div>;
}

export function CTASection() {
  return <section className="cta-section"><Reveal className="shell cta-inner"><div><p className="eyebrow">Ready when you are</p><h2>Let’s take laundry off your list.</h2><p>Choose a pickup request. A FreshFold team member confirms the slot and details before anything moves.</p></div><div className="hero-actions"><Link className="button button-light" href="/book">Book a pickup <Icon name="arrow"/></Link><Link className="button button-ghost-light" href="/contact">Ask a question</Link></div></Reveal></section>;
}

export function DemoBanner() {
  if (!publicRuntime.isReview) return null;
  return <div className="demo-banner"><div className="shell"><Icon name="warning" size={18}/><span><strong>Owner review build:</strong> realistic demo records are active. No external message, payment or sensitive upload is sent.</span></div></div>;
}
