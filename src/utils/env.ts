export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export function getRequiredEnv(
  value: string | undefined,
  name: string
): string {
  if (!value) {
    throw new Error(`${name} is not set as an environment variable.`);
  }

  return value;
}

export function readSupabaseConfig(env: {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_KEY?: string;
}): SupabaseConfig {
  return {
    url: getRequiredEnv(env.VITE_SUPABASE_URL, "VITE_SUPABASE_URL"),
    anonKey: getRequiredEnv(env.VITE_SUPABASE_KEY, "VITE_SUPABASE_KEY"),
  };
}
