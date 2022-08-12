import * as trpc from "@trpc/server";
import { listingRouter } from "./listing";

export const appRouter = trpc.router().merge("listing.", listingRouter);

export type AppRouter = typeof appRouter;
