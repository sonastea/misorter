import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { featureUrls } from "./scripts/feature-urls-plugin";

export default defineConfig({
  build: {
    manifest: process.env.BUNDLE_ANALYSIS === "1",
    rolldownOptions: {
      output: {
        // All static dependencies of a deferred feature must already be loaded.
        // This keeps retrying its entry URL sufficient after a failed native import.
        manualChunks(id) {
          if (
            /\/(?:utils\/feature-loaders\.ts|components\/(?:ConfirmModal|ListTransferStatus)\.tsx|select\/select\.js)$/.test(
              id
            )
          )
            return "feature-loading";
        },
      },
    },
  },
  plugins: [
    featureUrls(),
    ...(process.env.BUNDLE_ANALYSIS === "1"
      ? [
          {
            name: "module-inventory",
            generateBundle(_options, bundle) {
              this.emitFile({
                type: "asset",
                fileName: "module-inventory.json",
                source: JSON.stringify(
                  Object.fromEntries(
                    Object.entries(bundle)
                      .filter(([, output]) => output.type === "chunk")
                      .map(([file, output]) => [
                        file,
                        output.type === "chunk"
                          ? Object.keys(output.modules)
                          : [],
                      ])
                  ),
                  null,
                  2
                ),
              });
            },
          } satisfies import("vite").Plugin,
        ]
      : []),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
    proxy: {
      "/trpc": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
