import { AppRouter } from "@router/_app";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import superjson from "superjson";

function getBaseUrl() {
  if (typeof window === "undefined") return ""; // Browser should use current path
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`; // SSR should use vercel url

  return `http://${window.location.hostname}:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
}

export const trpc = createTRPCNext<AppRouter>({
  config() {
    const url = `${getBaseUrl()}/api/trpc`;

    return {
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url,
        }),
      ],
      transformer: superjson,
    };
  },
  ssr: false,
});
