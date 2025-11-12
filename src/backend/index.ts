import { initTRPC } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

const t = initTRPC.create();

export const router = t.router;
export const procedure = t.procedure;

export const createContext = async ({
  req,
  resHeaders,
}: FetchCreateContextFnOptions) => {
  return { req, resHeaders };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
