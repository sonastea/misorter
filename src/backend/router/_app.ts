import { router } from "src/backend/trpc";
import { listingRouter } from "./listing";
import { twitchRouter } from "./twitch";

export const appRouter = router({
  listing: listingRouter,
  twitch: twitchRouter,
});

export type AppRouter = typeof appRouter;
