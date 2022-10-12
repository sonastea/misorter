import * as trpc from "@trpc/server";
import { listingRouter } from "./listing";
import { twitch } from "./twitch";

export const appRouter = trpc
  .router()
  .merge("listing.", listingRouter)
  .merge("twitch.", twitch);

export type AppRouter = typeof appRouter;
