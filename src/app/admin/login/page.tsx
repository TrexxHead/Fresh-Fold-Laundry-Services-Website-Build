import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return <div className="shell auth-page"><div><p className="eyebrow">FreshFold operations</p><h1>Secure staff access.</h1><p>Individual accounts, server-side roles, database row policies, and an audit trail protect customer operations.</p><Notice tone="warning" title="No shared accounts">Production staff access must be individually granted, reviewed, and removed when a role changes. Super Admin actions require the strongest approved authentication policy.</Notice></div><AuthForm audience="staff" nextPath="/admin"/></div>;
}
