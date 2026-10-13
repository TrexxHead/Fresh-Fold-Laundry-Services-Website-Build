import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DemoProvider } from "@/context/demo-context";
import { Footer, Header, StickyBookingAction } from "@/components/site-shell";
import { DemoBanner } from "@/components/ui";
import { MotionProvider, RouteTransition } from "@/components/motion-system";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "FreshFold Laundry | Pickup & delivery in Kingston", template: "%s | FreshFold Laundry" },
  description: "Request laundry pickup, wash, dry, fold and ironing service across Kingston, Jamaica. Every request and estimate is confirmed by staff.",
  openGraph: { title: "Fresh laundry, without losing your day.", description: "Laundry pickup, care and return across Kingston.", type: "website", locale: "en_JM" },
  robots: { index: false, follow: false }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#E3F5FB" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-JM" data-scroll-behavior="smooth"><body><MotionProvider><DemoProvider><DemoBanner/><Header/><RouteTransition>{children}</RouteTransition><Footer/><StickyBookingAction/></DemoProvider></MotionProvider></body></html>;
}
