import { publicProcedure, router } from "@/backend/trpc";
import { getDb } from "@/db/client";
import { supportSubmissions } from "@/db/schema";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis/cloudflare";
import { TRPCError } from "@trpc/server";
import { createInsertSchema } from "drizzle-orm/zod";
import { Resend } from "resend";

const supportSubmissionsInputSchema = createInsertSchema(supportSubmissions);
type SubmissionEmailPayload = typeof supportSubmissions.$inferInsert;

let redis: Redis | null = null;
let supportRateLimit: Ratelimit | null = null;
let resend: Resend | null = null;

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

const getResend = () => {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("ENV var RESEND_API_KEY is not set!");
  }

  if (!resend) {
    resend = new Resend(resendApiKey);
  }

  return resend;
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
  const supportFromEmail = process.env.SUPPORT_FROM_EMAIL;
  const supportToEmail = process.env.SUPPORT_TO_EMAIL;

  if (!supportFromEmail || !supportToEmail) {
    throw new Error(
      "Missing one of required env vars: SUPPORT_FROM_EMAIL, SUPPORT_TO_EMAIL"
    );
  }

  const resendClient = getResend();

  const createdAtLocal = payload.createdAt
    ? payload.createdAt.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "Unknown";

  const { error } = await resendClient.emails.send({
    from: supportFromEmail,
    to: [supportToEmail],
    subject: `[misorter] ${payload.type.toUpperCase()} - ${payload.topic}`,
    text: [
      `Submission ID: ${payload.id}`,
      `Type: ${payload.type}`,
      `Topic: ${payload.topic}`,
      `Email: ${payload.email ?? "Not provided"}`,
      `Created At: ${createdAtLocal}`,
      "",
      payload.message,
    ].join("\n"),
    replyTo: payload.email ?? undefined,
  });

  if (error) {
    throw new Error(
      `Resend email request failed: ${error.name} - ${error.message}`
    );
  }
};

export const supportRouter = router({
  submit: publicProcedure
    .input(supportSubmissionsInputSchema)
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
