import { prisma } from "@db/client";
import { Prisma } from "@prisma/client";
import Redis from "ioredis";
import { customAlphabet } from "nanoid";
import { publicProcedure, router } from "src/backend/trpc";
import { array, object, string } from "superstruct";

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
      object({
        label: string(),
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
  getFeatured: publicProcedure.query(async () => {
    const topKLists = 3;
    let featured: any[] = [];
    let daysAgo = 5;
    let kDaysAgo;

    kDaysAgo = new Date(new Date().setDate(new Date().getDate() - daysAgo));

    featured = await prisma.listing.findMany({
      select: {
        label: true,
        title: true,
        items: {
          select: {
            id: true,
            value: true,
          },
        },
      },
      orderBy: {
        visits: {
          _count: "desc",
        },
      },
      where: {
        createdAt: {
          gte: kDaysAgo,
        },
        visits: {
          some: {
            createdAt: {
              gte: kDaysAgo,
            },
          },
        },
      },
      take: topKLists,
    });

    if (featured.length < topKLists) {
      featured = await prisma.listing.findMany({
        select: {
          label: true,
          title: true,
          items: {
            select: {
              id: true,
              value: true,
            },
          },
        },
        // skip: Math.floor(Math.random() * 10),
        take: 3,
      });
    }

    return featured;
  }),
  create: publicProcedure
    .input(
      object({
        title: string(),
        items: array(
          object({
            value: string(),
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
      object({
        label: string(),
        title: string(),
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
