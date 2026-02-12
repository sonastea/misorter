import { router } from "src/backend/trpc";
import { listingRouter } from "./listing";
import { noticeRouter } from "./notice";
import { supportRouter } from "./support";

export const appRouter = router({
  listing: listingRouter,
  notice: noticeRouter,
  support: supportRouter,
});

export type AppRouter = typeof appRouter;
