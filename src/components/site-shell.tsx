"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "./icon";
import { motionTokens } from "@/lib/motion";

const navigation = [
  ["Services & prices", "/services"], ["How it works", "/how-it-works"], ["Schedule", "/service-area"], ["Subscriptions", "/subscriptions"], ["FAQ", "/faq"]
] as const;

function NavigationLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return <>
    {navigation.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={onNavigate}>{label}</Link>)}
    <Link href="/book" className="button button-small" onClick={onNavigate}>Book a pickup <Icon name="arrow"/></Link>
  </>;
}

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="wordmark" aria-label="FreshFold home">
          <span className="wordmark-mark" aria-hidden="true"><span/><span/><span/></span>
          <span>FreshFold<small>Laundry Company Ltd</small></span>
        </Link>
        <nav className="main-nav desktop-nav" aria-label="Primary navigation"><NavigationLinks pathname={pathname}/></nav>
        <motion.button className="menu-button" type="button" onClick={() => setOpen((value) => !value)} whileTap={{ scale: .92 }} aria-expanded={open} aria-controls="mobile-primary-navigation" aria-label={open ? "Close menu" : "Open menu"}><Icon name={open ? "close" : "menu"} size={24}/></motion.button>
        <AnimatePresence initial={false} mode="wait">
          {open && <motion.nav
            id="mobile-primary-navigation"
            key="mobile-navigation"
            className="main-nav mobile-nav is-open"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
          ><NavigationLinks pathname={pathname} onNavigate={() => setOpen(false)}/></motion.nav>}
        </AnimatePresence>
      </div>
    </header>
  </>;
}

export function Footer() {
  return <footer className="site-footer">
    <div className="shell footer-grid">
      <div><Link href="/" className="wordmark wordmark-light"><span className="wordmark-mark" aria-hidden="true"><span/><span/><span/></span><span>FreshFold<small>Laundry Company Ltd</small></span></Link><p>Pickup, care and return across Kingston, Jamaica—subject to staff confirmation.</p><p className="fine-print">Owner review build · Contact details and logo must be confirmed before launch.</p></div>
      <div><h2>Explore</h2><Link href="/services">Services & prices</Link><Link href="/book">Book a pickup</Link><Link href="/orders">Track an order</Link><Link href="/contact">Contact</Link></div>
      <div><h2>Policies</h2><Link href="/terms">Draft Terms</Link><Link href="/privacy">Draft Privacy Notice</Link><Link href="/admin/login">Staff demo</Link><Link href="/design-system">Design system</Link></div>
      <div><h2>Development contact seed</h2><p>876-223-6339<br/>freshfoldlaundryjm@gmail.com<br/>@freshfoldlaundry.jm</p><p className="fine-print">Verify ownership before publishing.</p></div>
    </div>
    <div className="shell footer-bottom"><span>© {new Date().getFullYear()} FreshFold Laundry Company Ltd</span><span>Kingston, Jamaica · Prices in JMD</span></div>
  </footer>;
}

export function StickyBookingAction() {
  const pathname = usePathname();
  if (pathname.startsWith("/book") || pathname.startsWith("/admin")) return null;
  return <motion.div className="sticky-book" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2 }}><Link href="/book" className="button">Book a pickup <Icon name="calendar"/></Link></motion.div>;
}
