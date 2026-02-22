import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let supabaseBrowserClient: SupabaseClient | null = null;

function getRequiredEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required to use Supabase auth.`);
  }

  return value;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!supabaseBrowserClient) {
    supabaseBrowserClient = createBrowserClient(
      getRequiredEnv(import.meta.env.VITE_SUPABASE_URL, "VITE_SUPABASE_URL"),
      getRequiredEnv(import.meta.env.VITE_SUPABASE_KEY, "VITE_SUPABASE_KEY")
    );
  }

  return supabaseBrowserClient;
}
