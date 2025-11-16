import { QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createRouter as createTanStackRouter,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { queryClient } from "@utils/trpc";
import { routeTree } from "@/routeTree.gen";
import "@/styles/globals.css";

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    context: {
      queryClient,
    },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={createRouter()} />
      </QueryClientProvider>
    </StrictMode>
  );
}
