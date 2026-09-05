import { Redis } from "@upstash/redis/cloudflare";

let redis: Redis | null = null;

export const getRedis = () => {
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
