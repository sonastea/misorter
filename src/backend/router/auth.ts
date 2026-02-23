import { publicProcedure, router } from "@/backend/trpc";
import {
  parseCookieHeader,
  serializeSetCookie,
  type CookieToSet,
} from "@/utils/cookie-headers";
import { createServerClient } from "@supabase/ssr";

type SupabaseConfig = {
  url: string;
  anonKey: string;
};

let supabaseConfig: SupabaseConfig | null = null;

function getRequiredEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is not set as an environment variable.`);
  }

  return value;
}

function getSupabaseConfig(): SupabaseConfig {
  if (!supabaseConfig) {
    supabaseConfig = {
      url: getRequiredEnv(process.env.VITE_SUPABASE_URL, "VITE_SUPABASE_URL"),
      anonKey: getRequiredEnv(
        process.env.VITE_SUPABASE_KEY,
        "VITE_SUPABASE_KEY"
      ),
    };
  }

  return supabaseConfig;
}

export const authRouter = router({
  getCurrentUser: publicProcedure.query(async ({ ctx }) => {
    const cookieHeader = ctx.req.headers.get("cookie") ?? "";
    if (!cookieHeader) {
      return null;
    }

    const { url, anonKey } = getSupabaseConfig();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => parseCookieHeader(cookieHeader),
        setAll: (cookiesToSet: CookieToSet[]) => {
          for (const cookieToSet of cookiesToSet) {
            ctx.resHeaders.append(
              "set-cookie",
              serializeSetCookie(cookieToSet)
            );
          }
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  }),
});
