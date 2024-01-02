import { prisma } from "@db/client";
import { Prisma } from "@prisma/client";
import Redis from "ioredis";
import { customAlphabet } from "nanoid";
import { publicProcedure, router } from "src/backend/trpc";
import { z } from "zod";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  16
);

const redis = new Redis(process.env.REDIS_URL as string);
const RedisExpireTime: number = 7 * (60 * 60 * 24); // expire time in days from seconds

const ListType = Prisma.validator<Prisma.ListingDefaultArgs>()({
  select: {
    label: true,
    title: true,
    visits: true,
  },
  include: {
    items: { select: { value: true } },
  },
});

export type List = Prisma.ListingGetPayload<typeof ListType>;

const updateListingVisited = async (listingId: string) => {
  const date = new Date();

  // Update the updatedAt field and connect a new Visit record
  await prisma.listing.update({
    where: { label: listingId },
    data: {
      updatedAt: date,
      visits: {
        create: { createdAt: date },
      },
    },
  });
};

export const listingRouter = router({
  get: publicProcedure
    .input(
      z.object({
        label: z.string(),
      })
    )
    .query(async ({ input }) => {
      let list: Partial<List> | null = {};

      await updateListingVisited(input.label);

      await redis.get(input.label).then(async (result) => {
        if (result != null) {
          list = JSON.parse(result);
        } else {
          list = await prisma.listing.findUnique({
            where: { label: input.label },
            select: {
              label: true,
              title: true,
              items: {
                orderBy: { id: "asc" },
                select: { value: true },
              },
            },
          });
          await redis.set(input.label, JSON.stringify(list));
          await redis.expire(input.label, RedisExpireTime);
        }
      });

      return list;
    }),
  create: publicProcedure
    .input(
      z.object({
        title: z.string(),
        items: z.array(
          z.object({
            value: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const newLabel = nanoid();
      const list = await prisma.listing.create({
        data: {
          label: newLabel,
          title: input.title,
          items: { create: input.items },
        },
        select: {
          label: true,
          title: true,
          items: {
            orderBy: { id: "asc" },
            select: { value: true },
          },
        },
      });

      return list;
    }),
  updateTitle: publicProcedure
    .input(
      z.object({
        label: z.string(),
        title: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const updatedList = await prisma.listing.update({
        where: { label: input.label },
        data: { title: input.title },
        select: {
          label: true,
          title: true,
          items: {
            select: { value: true },
          },
        },
      });
      await redis.set(input.label, JSON.stringify(updatedList), "KEEPTTL");

      return updatedList;
    }),
});
