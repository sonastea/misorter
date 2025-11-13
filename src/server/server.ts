import { createContext } from "@/backend/index";
import { appRouter } from "@router/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

export default {
  async fetch(request: Request): Promise<Response> {
    return fetchRequestHandler({
      endpoint: "/trpc",
      req: request,
      router: appRouter,
      createContext,
    });
  },
};
