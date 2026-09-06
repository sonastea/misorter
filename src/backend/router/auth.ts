import { publicProcedure, router } from "@/backend/trpc";
import {
  parseCookieHeader,
  serializeSetCookie,
  type CookieToSet,
} from "@/utils/cookie-headers";
import { createServerClient } from "@supabase/ssr";
import { readSupabaseConfig, type SupabaseConfig } from "@/utils/env";

let supabaseConfig: SupabaseConfig | null = null;

function getSupabaseConfig(): SupabaseConfig {
  if (!supabaseConfig) {
    supabaseConfig = readSupabaseConfig(process.env);
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
