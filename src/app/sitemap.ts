import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return ["", "/services", "/book", "/how-it-works", "/service-area", "/subscriptions", "/faq", "/contact", "/terms", "/privacy"]
    .map((path) => ({ url: `${base}${path}`, lastModified: new Date("2026-10-14"), changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.7 }));
}
