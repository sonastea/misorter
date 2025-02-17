import { prisma } from "@db/client";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import Redis from "ioredis";
import { customAlphabet } from "nanoid";
import { publicProcedure, router } from "src/backend/trpc";
import { array, enums, object, string } from "superstruct";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  16
);

const TOP_K_LISTS = 3;
const DAYS_AGO = 5;

const RedisExpireTime: number = 7 * (60 * 60 * 24); // expire time in days from seconds
const redis = new Redis(process.env.REDIS_URL as string, {
  retryStrategy: (times) => Math.min(times * 50, 15000),
})
  .on("error", (err) => console.error("Redis error: ", err.message))
  .on("connect", () => console.log("Redis is connected."));

const baseList = {
  select: {
    label: true,
    title: true,
    visits: true,
  },
  include: {
    items: {
      select: {
        value: true,
      },
    },
  },
} as const;

const featuredList = {
  ...baseList,
  select: {
    ...baseList.select,
    updatedAt: true,
    createdAt: true,
    items: {
      select: {
        ...baseList.include.items.select,
        id: true,
      },
    },
  },
  include: {
    ...baseList.include,
  },
} as const;

export const ListType = Prisma.validator<Prisma.ListingDefaultArgs>()(baseList);
export const FeaturedLists =
  Prisma.validator<Prisma.ListingDefaultArgs>()(featuredList);
export type List = Prisma.ListingGetPayload<typeof ListType>;

const VisitSourceEnum = enums(["URL", "FEATURED"]);

const updateListingVisited = async (
  listingId: string,
  source: typeof VisitSourceEnum.TYPE
) => {
  const date = new Date();

  try {
    // Update the updatedAt field and connect a new Visit record
    const result = await prisma.listing.update({
      where: { label: listingId },
      data: {
        updatedAt: date,
        visits: {
          create: { createdAt: date, source },
        },
      },
    });
    return result;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma Error: ", e.code);
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid listing label.",
        cause: e,
      });
    }
  }
  return { id: -1 };
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

      await updateListingVisited(input.label, "URL");

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
    const kDaysAgo = new Date();
    kDaysAgo.setDate(kDaysAgo.getDate() - DAYS_AGO);

    const getFeatured = async (kDaysAgo: Date) => {
      const featured = await prisma.listing.findMany({
        ...FeaturedLists,
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
        take: TOP_K_LISTS,
      });

      if (featured?.length < TOP_K_LISTS) {
        const needed = TOP_K_LISTS - featured.length;
        const excluded = featured.map((list) => list.label);
        const randomListings = await prisma.listing.findManyRandom(needed, {
          ...FeaturedLists,
          where: {
            label: {
              notIn: excluded,
            },
          },
        });

        return [...featured, ...randomListings];
      }
    };

    return await getFeatured(kDaysAgo);
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
      const list = await prisma.listing
        .create({
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
        })
        .finally(async () => await updateListingVisited(newLabel, "FEATURED"));

      return list;
    }),
  createVisit: publicProcedure
    .input(
      object({
        label: string(),
        source: VisitSourceEnum,
      })
    )
    .mutation(async ({ input }) => {
      const result = await updateListingVisited(input.label, input.source);

      if (!result.id || result.id === -1) {
        return { success: false };
      }

      return { success: true };
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
