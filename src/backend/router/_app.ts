import { router } from "@/backend/trpc";
import { authRouter } from "./auth";
import { listingRouter } from "./listing";
import { noticeRouter } from "./notice";
import { supportRouter } from "./support";

export const appRouter = router({
  auth: authRouter,
  listing: listingRouter,
  notice: noticeRouter,
  support: supportRouter,
});

export type AppRouter = typeof appRouter;
