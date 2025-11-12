import { createContext } from "@/backend/index";
import { appRouter } from "@router/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

function getAllowedOrigin(origin: string | null): string {
  if (!origin) return "*";

  if (origin.match(/^https:\/\/[a-z0-9-]+\.misorter\.com$/)) {
    return origin;
  }

  if (origin.match(/^http:\/\/localhost:\d+$/)) {
    return origin;
  }

  return "*";
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get("Origin");
    const allowedOrigin = getAllowedOrigin(origin);

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const response = await fetchRequestHandler({
      endpoint: "/trpc",
      req: request,
      router: appRouter,
      createContext,
    });

    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
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
