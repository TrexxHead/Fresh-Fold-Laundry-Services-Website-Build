"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { publicRuntime } from "@/lib/runtime";
import { Notice } from "./ui";
import { Icon } from "./icon";

export function AuthForm({ audience, nextPath }: { audience: "customer" | "staff"; nextPath: string }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (publicRuntime.isReview) {
    return <div className="card wizard-card auth-card"><div className="icon-tile"><Icon name="lock"/></div><h2>{audience === "staff" ? "Operations review" : "Customer account preview"}</h2><Notice title="Clearly labelled demo access">This route uses synthetic records and does not create a real account or send an email.</Notice><div className="hero-actions section-gap"><Link className="button" href={audience === "staff" ? "/admin" : "/orders"}>{audience === "staff" ? "Enter operations demo" : "Open demo order hub"} <Icon name="arrow"/></Link>{audience === "customer" && <Link className="button button-secondary" href="/book">Continue as guest</Link>}</div></div>;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");
    try {
      const client = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`;
      const { error: authError } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: audience === "customer" } });
      if (authError) throw authError;
      setMessage(audience === "staff" ? "Check your approved staff email for a secure sign-in link." : "Check your email for a secure sign-in link. Guest booking remains available.");
    } catch {
      setError("Secure sign-in is temporarily unavailable. Check the address or contact an administrator if the problem continues.");
    } finally {
      setPending(false);
    }
  };

  return <form className="card wizard-card auth-card" onSubmit={(event) => void submit(event)}><div className="icon-tile"><Icon name="lock"/></div><h2>{audience === "staff" ? "Staff sign in" : "Email me a secure sign-in link"}</h2><p>{audience === "staff" ? "Use the individual email approved for your FreshFold staff account. MFA may be required by policy." : "No password to remember. You can still book and track an order as a guest."}</p><div className="form-group"><label htmlFor={`${audience}-email`}>Email</label><input className="input" id={`${audience}-email`} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)}/></div><button className="button section-gap" type="submit" disabled={pending} aria-busy={pending}>{pending ? "Sending secure link…" : "Send secure link"}</button>{message && <div className="section-gap"><Notice tone="success" title="Link requested">{message}</Notice></div>}{error && <div className="section-gap"><Notice tone="warning" title="Sign-in unavailable">{error}</Notice></div>}</form>;
}
