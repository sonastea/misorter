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

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const { createHTTPServer } = await import(
      "@trpc/server/adapters/standalone"
    );
    const cors = (await import("cors")).default;

    const server = createHTTPServer({
      middleware: cors({
        origin: [
          "http://localhost:3000",
          "http://localhost:4000",
          "http://localhost:5173",
        ],
      }),
      router: appRouter,
    });

    const PORT = process.env.SERVER_PORT || 4000;

    server.listen(PORT, () => {
      console.log(
        `🚀 tRPC server listening on http://localhost:${PORT} ❗ This is a development server. ❗`
      );
    });
  })();
}
