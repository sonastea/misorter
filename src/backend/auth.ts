import { createServerClient } from "@supabase/ssr";
import type { Context } from "@/backend/context";
import {
  parseCookieHeader,
  serializeSetCookie,
  type CookieToSet,
} from "@/utils/cookie-headers";
import { readSupabaseConfig, type SupabaseConfig } from "@/utils/env";

let config: SupabaseConfig | undefined;

export async function getVerifiedUser(
  ctx: Pick<Context, "req" | "resHeaders">
) {
  const cookieHeader = ctx.req.headers.get("cookie") ?? "";
  if (!cookieHeader) return null;
  config ??= readSupabaseConfig(process.env);
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => parseCookieHeader(cookieHeader),
      setAll: (cookies: CookieToSet[]) => {
        for (const cookie of cookies)
          ctx.resHeaders.append("set-cookie", serializeSetCookie(cookie));
      },
    },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : user;
}
