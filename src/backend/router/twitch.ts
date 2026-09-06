import { publicProcedure, router } from "@/backend/trpc";
import { getRedis } from "@/utils/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { TRPCError } from "@trpc/server";
import * as v from "valibot";

let twitchRateLimit: Ratelimit | null = null;

const getTwitchRateLimit = () => {
  if (!twitchRateLimit) {
    twitchRateLimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, "10 m"),
      analytics: true,
      prefix: "ratelimit:twitch",
    });
  }

  return twitchRateLimit;
};

const getTwitchCredentials = () => {
  // Server-only env vars (no VITE_ prefix so Vite never embeds them).
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Twitch OAuth is not configured.",
    });
  }

  return { clientId, clientSecret };
};

const getRequestIp = (request: Request) => {
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) {
    return cloudflareIp;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  return "unknown";
};

type TwitchTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export const twitchRouter = router({
  exchangeCode: publicProcedure
    .input(
      v.object({
        code: v.pipe(v.string(), v.minLength(1), v.maxLength(512)),
        redirectUri: v.pipe(v.string(), v.url()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const ratelimitResult = await getTwitchRateLimit().limit(
        `twitch:ip:${getRequestIp(ctx.req)}`
      );

      if (!ratelimitResult.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many login attempts. Please wait and try again.",
        });
      }

      const { clientId, clientSecret } = getTwitchCredentials();

      const response = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: input.code,
          grant_type: "authorization_code",
          redirect_uri: input.redirectUri,
        }),
      });

      if (!response.ok) {
        // Auth codes are single-use and short-lived; an expired/reused code
        // is the common case, not a server fault.
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Twitch authorization code exchange failed.",
        });
      }

      const data = (await response.json()) as TwitchTokenResponse;

      if (!data.access_token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Twitch authorization code exchange failed.",
        });
      }

      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
      };
    }),
});
