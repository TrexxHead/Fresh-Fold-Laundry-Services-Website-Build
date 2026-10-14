import { createBrowserClient } from "@supabase/ssr";
import { isConfigured } from "../runtime";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured(url) || !isConfigured(key)) throw new Error("Secure account services are not configured.");
  return createBrowserClient(url, key);
}
