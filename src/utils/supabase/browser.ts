import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "@/utils/env";

let supabaseBrowserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!supabaseBrowserClient) {
    supabaseBrowserClient = createBrowserClient(
      getRequiredEnv(import.meta.env.VITE_SUPABASE_URL, "VITE_SUPABASE_URL"),
      getRequiredEnv(import.meta.env.VITE_SUPABASE_KEY, "VITE_SUPABASE_KEY")
    );
  }

  return supabaseBrowserClient;
}
