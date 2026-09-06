import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { Context } from "./context";
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

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const isAuthed = t.middleware(async ({ ctx, next }) => {
  const cookieHeader = ctx.req.headers.get("cookie") ?? "";
  if (!cookieHeader) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  const { url, anonKey } = getSupabaseConfig();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => parseCookieHeader(cookieHeader),
      setAll: (cookiesToSet: CookieToSet[]) => {
        for (const cookieToSet of cookiesToSet) {
          ctx.resHeaders.append("set-cookie", serializeSetCookie(cookieToSet));
        }
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  return next({
    ctx: {
      user,
    },
  });
});

export const { middleware, router, procedure: publicProcedure } = t;

export const protectedProcedure = t.procedure.use(isAuthed);
