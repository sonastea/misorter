import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "@/backend/context";
import { getVerifiedUser } from "@/backend/auth";

const t = initTRPC.context<Context>().create({ transformer: superjson });
const isAuthed = t.middleware(async ({ ctx, next }) => {
  const user = await getVerifiedUser(ctx);
  if (!user)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  return next({ ctx: { user } });
});
export const { middleware, router, procedure: publicProcedure } = t;
export const protectedProcedure = t.procedure.use(isAuthed);
