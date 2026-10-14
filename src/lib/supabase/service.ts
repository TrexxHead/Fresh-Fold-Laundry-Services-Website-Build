import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireProductionReadiness } from "../runtime";

export function createSupabaseServiceClient(): SupabaseClient {
  requireProductionReadiness();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
