import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const indexingEnabled = process.env.NEXT_PUBLIC_APP_MODE === "production" && process.env.NEXT_PUBLIC_ENABLE_INDEXING === "true";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return indexingEnabled
    ? { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] }, sitemap: `${base}/sitemap.xml` }
    : { rules: { userAgent: "*", disallow: "/" } };
}
