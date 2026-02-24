import { protectedProcedure, router } from "@/backend/trpc";
import { getDb } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod";

export const activityRouter = router({
  getRecent: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const logs = await db
        .select()
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(input.limit);

      return { logs };
    }),

  create: protectedProcedure
    .input(
      z.object({
        action: z.enum([
          "listing_delete",
          "listing_delete_many",
          "listing_create",
          "listing_update",
        ]),
        targetLabel: z.string().optional(),
        targetCount: z.number().min(1).default(1),
        details: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [log] = await db
        .insert(activityLogs)
        .values({
          action: input.action,
          targetLabel: input.targetLabel,
          targetCount: input.targetCount,
          details: input.details,
        })
        .returning();

      return { success: true, log };
    }),
});
