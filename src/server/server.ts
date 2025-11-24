import { createContext, WorkerContext } from "@/backend/context";
import { appRouter } from "@router/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Env {
  // Cloudflare bindings (KV, D1, R2, Hyperdrive, etc.) go here
  // For example, if you add KV storage:
  // CACHE: KVNamespace;
  // Inside wrangler.jsonc:
  // {
  //   "kv_namespaces": [
  //     {
  //       "binding": "CACHE",
  //       "id": "your-kv-namespace-id"
  //     }
  //   ]
  // }
}

export default {
  async fetch(
    request: Request,
    _env: Env,
    ctx: WorkerContext
  ): Promise<Response> {
    return fetchRequestHandler({
      endpoint: "/trpc",
      req: request,
      router: appRouter,
      createContext: (opts) => createContext(opts, ctx),
    });
  },
};
