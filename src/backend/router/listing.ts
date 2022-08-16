import { prisma } from "@db/client";
import * as trpc from "@trpc/server";
import Redis from "ioredis";
import { customAlphabet } from "nanoid";
import { z } from "zod";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  16
);

const redis = new Redis(process.env.REDIS_URL as string);
const RedisExpireTime: number = 7 * (60 * 24); // expire time in days from seconds

export const listingRouter = trpc
  .router()
  .query("get", {
    input: z.object({
      label: z.string(),
    }),
    async resolve({ input }) {
      let list: any;
      await redis.get(input.label).then(async (result) => {
        if (result != null) {
          list = JSON.parse(result);
        } else {
          list = await prisma.listing.findUnique({
            where: { label: input.label },
            select: {
              label: true,
              items: {
                select: {
                  value: true,
                },
              },
            },
          });
          redis.set(input.label, JSON.stringify(list));
          redis.expire(input.label, RedisExpireTime);
        }
      });

      return list;
    },
  })
  .mutation("create", {
    input: z.object({
      items: z.array(
        z.object({
          value: z.string(),
        })
      ),
    }),
    async resolve({ input }) {
      const newLabel = nanoid();
      const list = await prisma.listing.create({
        data: {
          label: newLabel,
          items: {
            create: input.items,
          },
        },
        select: {
          label: true,
          items: true,
        },
      });

      return list;
    },
  });
