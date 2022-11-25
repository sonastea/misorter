import { router } from "src/backend/trpc";
import { listingRouter } from "./listing";

export const appRouter = router({
  listing: listingRouter,
});

export type AppRouter = typeof appRouter;
