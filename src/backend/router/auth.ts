import { publicProcedure, router } from "@/backend/trpc";
import { getVerifiedUser } from "@/backend/auth";

export const authRouter = router({
  getCurrentUser: publicProcedure.query(({ ctx }) => getVerifiedUser(ctx)),
});
