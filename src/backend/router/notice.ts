import { publicProcedure, router } from "@/backend/trpc";
import { getDb } from "@/db/client";
import { notices } from "@/db/schema";
import { and, gte, isNull, lte, or, sql } from "drizzle-orm";

export const noticeRouter = router({
  getActive: publicProcedure.query(async () => {
    const db = getDb();
    const now = new Date();

    const activeNotices = await db
      .select()
      .from(notices)
      .where(
        and(
          or(isNull(notices.isActive), lte(notices.isActive, now)),
          or(isNull(notices.expiresAt), gte(notices.expiresAt, now))
        )
      )
      .orderBy(sql`${notices.createdAt} DESC`)
      .limit(1);

    return activeNotices[0] || null;
  }),
});
