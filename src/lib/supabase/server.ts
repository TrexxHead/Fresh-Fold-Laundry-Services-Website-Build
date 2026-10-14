import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isConfigured } from "../runtime";

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured(url) || !isConfigured(key)) throw new Error("Secure account services are not configured.");
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          for (const { name, value, options } of values) cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot set response cookies. src/proxy.ts refreshes them.
        }
      },
    },
  });
}
