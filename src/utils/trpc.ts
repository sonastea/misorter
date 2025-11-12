import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@router/_app";
import superjson from "superjson";

function getUrl() {
  const base = (() => {
    if (import.meta.env.VITE_API_URL)
      return `https://${import.meta.env.VITE_API_URL}`;

    if (typeof window !== "undefined") return "";

    return "http://localhost:3000";
  })();

  return `${base}/trpc`;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        import.meta.env.MODE === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
    }),
    httpBatchLink({
      transformer: superjson,
      url: getUrl(),
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
