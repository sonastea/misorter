import { publicProcedure, router } from "@/backend/trpc";
import { db } from "@/db/client";
import { items, listings, visits } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
import Redis from "ioredis";
import { customAlphabet } from "nanoid";
import { array, enums, object, string } from "superstruct";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  16
);

const TOP_K_LISTS = 3;
const CANDIDATE_POOL_SIZE = 10;
const DAYS_AGO = 5;

const RedisExpireTime: number = 7 * (60 * 60 * 24); // expire time in days from seconds

let redis: Redis | null = null;
const getRedis = (): Redis => {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL as string, {
      retryStrategy: (times) => Math.min(times * 50, 15000),
    })
      .on("error", (err) => console.error("Redis error: ", err.message))
      .on("connect", () => console.log("Redis is connected."));
  }
  return redis;
};

export type List = {
  label: string;
  title: string;
  items: { value: string }[];
  visits?: {
    id: number;
    createdAt: Date;
    listingLabel: string;
    source: string | null;
  }[];
};

export type FeaturedList = {
  id: number;
  label: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  items: { id: number; value: string }[];
  visits: {
    id: number;
    createdAt: Date;
    listingLabel: string;
    source: string | null;
  }[];
};

const VisitSource = enums(["URL", "FEATURED"]);

const updateListingVisited = async (
  listingId: string,
  source: typeof VisitSource.TYPE
) => {
  const date = new Date();

  try {
    await db
      .update(listings)
      .set({ updatedAt: date })
      .where(eq(listings.label, listingId));

    const result = await db
      .insert(visits)
      .values({ createdAt: date, listingLabel: listingId, source })
      .returning({ id: visits.id });

    return result[0] || { id: -1 };
  } catch (e) {
    console.error("Database Error: ", e);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid listing label.",
      cause: e,
    });
  }
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

      const redisClient = getRedis();
      await redisClient.get(input.label).then(async (result) => {
        if (result != null) {
          list = JSON.parse(result);
        } else {
          const listing = await db.query.listings.findFirst({
            where: eq(listings.label, input.label),
            columns: {
              label: true,
              title: true,
            },
            with: {
              items: {
                columns: { value: true },
                orderBy: (items, { asc }) => [asc(items.id)],
              },
            },
          });

          list = listing || null;
          await redisClient.set(input.label, JSON.stringify(list));
          await redisClient.expire(input.label, RedisExpireTime);
        }
      });

      return list;
    }),
  getFeatured: publicProcedure.query(async () => {
    const kDaysAgo = new Date();
    kDaysAgo.setDate(kDaysAgo.getDate() - DAYS_AGO);

    const getFeatured = async (kDaysAgo: Date) => {
      const popularCandidates = await db
        .select({
          id: listings.id,
          label: listings.label,
          title: listings.title,
          createdAt: listings.createdAt,
          updatedAt: listings.updatedAt,
          visitCount: sql<number>`count(${visits.id})::int`,
        })
        .from(listings)
        .leftJoin(
          visits,
          and(
            eq(visits.listingLabel, listings.label),
            gte(visits.createdAt, kDaysAgo)
          )
        )
        .groupBy(listings.id)
        .orderBy(desc(sql`count(${visits.id})`))
        .limit(CANDIDATE_POOL_SIZE);

      const shuffledPopular = [...popularCandidates].sort(
        () => Math.random() - 0.5
      );
      const popularList = shuffledPopular.slice(
        0,
        Math.min(1, popularCandidates.length)
      );

      const excluded = popularList.map((list) => list.label);
      const needed = TOP_K_LISTS - popularList.length;

      const randomListings = await db
        .select()
        .from(listings)
        .where(
          excluded.length > 0 ? notInArray(listings.label, excluded) : undefined
        )
        .orderBy(sql`RANDOM()`)
        .limit(needed);

      const selectedListings = [...popularList, ...randomListings];
      const selectedLabels = selectedListings.map((l) => l.label);

      if (selectedLabels.length === 0) {
        return [];
      }

      const [allItems, allVisits] = await Promise.all([
        db
          .select({
            id: items.id,
            value: items.value,
            listingLabel: items.listingLabel,
          })
          .from(items)
          .where(inArray(items.listingLabel, selectedLabels)),
        db
          .select()
          .from(visits)
          .where(inArray(visits.listingLabel, selectedLabels)),
      ]);

      const itemsByLabel = allItems.reduce(
        (acc, item) => {
          if (!acc[item.listingLabel]) acc[item.listingLabel] = [];
          acc[item.listingLabel].push({ id: item.id, value: item.value });
          return acc;
        },
        {} as Record<string, { id: number; value: string }[]>
      );

      const visitsByLabel = allVisits.reduce(
        (acc, visit) => {
          if (!acc[visit.listingLabel]) acc[visit.listingLabel] = [];
          acc[visit.listingLabel].push(visit);
          return acc;
        },
        {} as Record<string, typeof allVisits>
      );

      return selectedListings.map((listing) => ({
        ...listing,
        items: itemsByLabel[listing.label] || [],
        visits: visitsByLabel[listing.label] || [],
      }));
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

      const result = await db.transaction(async (tx) => {
        const [listing] = await tx
          .insert(listings)
          .values({
            label: newLabel,
            title: input.title,
          })
          .returning({ label: listings.label, title: listings.title });

        const insertedItems =
          input.items.length > 0
            ? await tx
                .insert(items)
                .values(
                  input.items.map((item) => ({
                    value: item.value,
                    listingLabel: newLabel,
                  }))
                )
                .returning({ value: items.value })
            : [];

        return {
          ...listing,
          items: insertedItems,
        };
      });

      await updateListingVisited(newLabel, "FEATURED");

      // TODO: axiom log.info("created list", { label: newLabel, title: input.title });

      return result;
    }),
  createVisit: publicProcedure
    .input(
      object({
        label: string(),
        source: VisitSource,
      })
    )
    .mutation(async ({ input }) => {
      const result = await updateListingVisited(input.label, input.source);

      // TODO: axiom log.info("visited list", {
      //   label: input.label,
      //   visit_source: input.source,
      // });

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
      const [listing] = await db
        .update(listings)
        .set({ title: input.title })
        .where(eq(listings.label, input.label))
        .returning({ label: listings.label, title: listings.title });

      const listingItems = await db.query.items.findMany({
        where: eq(items.listingLabel, input.label),
        columns: { value: true },
      });

      const updatedList = {
        ...listing,
        items: listingItems,
      };

      await getRedis().set(input.label, JSON.stringify(updatedList), "KEEPTTL");

      // TODO: axiom log.info("update list title", { label: input.label, title: input.title });

      return updatedList;
    }),
});
