import { publicProcedure, router } from "@/backend/trpc";
import { getDb } from "@/db/client";
import { supportSubmissions } from "@/db/schema";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis/cloudflare";
import { TRPCError } from "@trpc/server";
import { createInsertSchema } from "drizzle-orm/zod";

const supportInputSchema = createInsertSchema(supportSubmissions);
type SubmissionEmailPayload = typeof supportSubmissions.$inferInsert;

let redis: Redis | null = null;
let supportRateLimit: Ratelimit | null = null;

const getRedis = () => {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  if (!upstashUrl) {
    throw new Error("ENV var UPSTASH_REDIS_REST_URL is not set!");
  }

  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!upstashToken) {
    throw new Error("ENV var UPSTASH_REDIS_REST_TOKEN is not set!");
  }

  if (!redis) {
    redis = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });
  }

  return redis;
};

const getSupportRateLimit = () => {
  if (!supportRateLimit) {
    supportRateLimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, "3 m"),
      analytics: true,
      prefix: "ratelimit:support",
    });
  }

  return supportRateLimit;
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

const sendSupportEmail = async (payload: SubmissionEmailPayload) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const supportFromEmail = process.env.SUPPORT_FROM_EMAIL;
  const supportToEmail = process.env.SUPPORT_TO_EMAIL;

  if (!resendApiKey || !supportFromEmail || !supportToEmail) {
    throw new Error(
      "Missing one of required env vars: RESEND_API_KEY, SUPPORT_FROM_EMAIL, SUPPORT_TO_EMAIL"
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: supportFromEmail,
      to: [supportToEmail],
      subject: `[misorter] ${payload.type.toUpperCase()} - ${payload.topic}`,
      text: [
        `Submission ID: ${payload.id}`,
        `Type: ${payload.type}`,
        `Topic: ${payload.topic}`,
        `Email: ${payload.email ?? "Not provided"}`,
        `Created At: ${payload.createdAt?.toISOString()}`,
        "",
        payload.message,
      ].join("\n"),
      reply_to: payload.email ?? undefined,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Resend email request failed (${response.status}): ${errorBody}`
    );
  }
};

export const supportRouter = router({
  submit: publicProcedure
    .input(supportInputSchema)
    .mutation(async ({ input, ctx }) => {
      const ip = getRequestIp(ctx.req);
      const ratelimitResult = await getSupportRateLimit().limit(
        `support:ip:${ip}`
      );

      if (!ratelimitResult.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Too many support submissions. Please wait 3 minutes and try again.",
        });
      }

      const db = getDb();
      const [submission] = await db
        .insert(supportSubmissions)
        .values({
          type: input.type,
          topic: input.topic,
          message: input.message,
          email: input.email,
        })
        .returning({
          id: supportSubmissions.id,
          type: supportSubmissions.type,
          topic: supportSubmissions.topic,
          message: supportSubmissions.message,
          email: supportSubmissions.email,
          createdAt: supportSubmissions.createdAt,
        });

      if (!submission) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to save support submission.",
        });
      }

      ctx.waitUntil(
        sendSupportEmail(submission).catch((error) => {
          console.error("Support email send failed:", error);
        })
      );

      return {
        success: true,
        id: submission.id,
        receivedAt: submission.createdAt,
      };
    }),
});
