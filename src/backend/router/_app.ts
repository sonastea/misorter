import { router } from "src/backend/trpc";
import { listingRouter } from "./listing";
import { noticeRouter } from "./notice";

export const appRouter = router({
  listing: listingRouter,
  notice: noticeRouter,
});

export type AppRouter = typeof appRouter;
