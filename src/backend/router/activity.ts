import { protectedProcedure, router } from "@/backend/trpc";
import { getDb } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import * as v from "valibot";
import { activityLogActions } from "@/db/schema";

export const activityRouter = router({
  getRecent: protectedProcedure
    .input(
      v.object({
        limit: v.optional(
          v.pipe(v.number(), v.minValue(1), v.maxValue(100)),
          20
        ),
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
      v.object({
        action: v.picklist(activityLogActions),
        targetLabel: v.optional(v.string()),
        targetCount: v.optional(v.pipe(v.number(), v.minValue(1)), 1),
        details: v.optional(v.string()),
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
