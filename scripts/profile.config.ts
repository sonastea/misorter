/** Opt-in production profiling build; never used by the release build. */
import { defineConfig, type Plugin } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { featureUrls } from "./feature-urls-plugin";

const record = `
function recordTransferWork(name: string, duration: number) {
  const target = globalThis as typeof globalThis & { __transferProfile?: { name: string; duration: number }[] };
  (target.__transferProfile ??= []).push({ name, duration });
}
`;
function profileWork(): Plugin {
  return {
    name: "profile-transfer-work",
    enforce: "pre",
    transform(code, id) {
      const name = id.endsWith("/list-transfer/schema.ts")
        ? "validateDraft"
        : id.endsWith("/list-transfer/serialize.ts")
          ? "serializeList"
          : undefined;
      if (name)
        return (
          code.replace(
            `export function ${name}(`,
            `function measured_${name}(`
          ) +
          record +
          `
export function ${name}(...args: Parameters<typeof measured_${name}>): ReturnType<typeof measured_${name}> {
  const start = performance.now();
  try { return measured_${name}(...args); }
  finally { recordTransferWork(${JSON.stringify(name)}, performance.now() - start); }
}`
        );
      const component = id.endsWith("/ListImportDialog.tsx")
        ? "ListImportDialog"
        : id.endsWith("/ListExportDialog.tsx")
          ? "ListExportDialog"
          : undefined;
      if (component)
        return (
          `import { Profiler as TransferProfiler } from "react";\n` +
          code.replace(
            `export default function ${component}(`,
            `function Measured${component}(`
          ) +
          record +
          `
export default function ${component}(props: React.ComponentProps<typeof Measured${component}>) {
  return <TransferProfiler id="${component}" onRender={(_id, _phase, duration) => recordTransferWork("${component}:render", duration)}><Measured${component} {...props} /></TransferProfiler>;
}`
        );
    },
  };
}
const root = process.env.PROFILE_ROOT ?? process.cwd();
export default defineConfig({
  root,
  plugins: [
    profileWork(),
    featureUrls(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: `${root}/src/routes`,
      generatedRouteTree: `${root}/src/routeTree.gen.ts`,
    }),
    react(),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: { "react-dom/client": "react-dom/profiling" },
  },
  build: { outDir: "dist-profile" },
});
