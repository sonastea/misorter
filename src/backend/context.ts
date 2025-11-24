import { initTRPC } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

const t = initTRPC.create();

export const router = t.router;
export const procedure = t.procedure;

export type WorkerContext = {
  waitUntil: (promise: Promise<unknown>) => void;
};

export const createContext = async (
  { req, resHeaders }: FetchCreateContextFnOptions,
  ctx: WorkerContext
) => {
  return {
    req,
    resHeaders,
    waitUntil: ctx.waitUntil,
  } as const;
};

export type Context = {
  req: Request;
  resHeaders: Headers;
  waitUntil: (promise: Promise<unknown>) => void;
};
