import { publicProcedure, router } from "@/backend/trpc";
import { getDb } from "@/db/client";
import { items, listings, visits } from "@/db/schema";
import { Redis } from "@upstash/redis/cloudflare";
import { and, desc, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { z } from "zod";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  16
);

const TOP_K_LISTS = 3;
const CANDIDATE_POOL_SIZE = 10;
const DAYS_AGO = 5;

const RedisExpireTime: number = 7 * (60 * 60 * 24); // expire time in days from seconds
let redis: Redis | null = null;

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

const VisitSourceSchema = z.enum(["URL", "FEATURED", "NEW"]);
type VisitSource = z.infer<typeof VisitSourceSchema>;

const updateListingVisited = async (listingId: string, source: VisitSource) => {
  const date = new Date();

  try {
    const db = getDb();
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
    console.error("Database Error:", e);
    return { id: -1 };
  }
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

      const redisClient = getRedis();
      const cachedResult = await redisClient
        .get<string>(input.label)
        .catch((e) => {
          console.error("Redis get error:", e);
          return null;
        });

      if (cachedResult != null && typeof cachedResult === "string") {
        try {
          list = JSON.parse(cachedResult);
        } catch (e) {
          console.error(e, input.label, "value:", cachedResult);
          await redisClient.del(input.label).catch((delError) => {
            console.error("Redis del error:", delError);
          });
          list = null;
        }
      }

      if (!list || Object.keys(list).length === 0) {
        const db = getDb();
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

        await redisClient
          .set(input.label, JSON.stringify(list), {
            ex: RedisExpireTime,
          })
          .catch((e) => {
            console.error("Redis set error:", e);
          });
      }

      return list;
    }),
  getFeatured: publicProcedure.query(async () => {
    const kDaysAgo = new Date();
    kDaysAgo.setDate(kDaysAgo.getDate() - DAYS_AGO);

    const getFeatured = async (kDaysAgo: Date) => {
      const db = getDb();
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

      const db = getDb();
      const result = await db.transaction(async (tx) => {
        const [listing] = await tx
          .insert(listings)
          .values({
            label: newLabel,
            title: input.title,
          })
          .returning({ label: listings.label, title: listings.title });

        const insertedItems = await tx
          .insert(items)
          .values(
            input.items.map((item) => ({
              value: item.value,
              listingLabel: newLabel,
            }))
          )
          .returning({ value: items.value });

        return {
          ...listing,
          items: insertedItems,
        };
      });

      // TODO: axiom log.info("created list", { label: newLabel, title: input.title });

      return result;
    }),
  createVisit: publicProcedure
    .input(
      z.object({
        label: z.string(),
        source: VisitSourceSchema.default("NEW"),
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
      z.object({
        label: z.string(),
        title: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
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

      await getRedis()
        .set(input.label, JSON.stringify(updatedList), {
          keepTtl: true,
        })
        .catch((e) => {
          console.error("Redis set error on updateTitle:", e);
        });

      // TODO: axiom log.info("update list title", { label: input.label, title: input.title });

      return updatedList;
    }),
});
