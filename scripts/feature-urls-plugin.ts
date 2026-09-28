import { resolve } from "node:path";
import type { Plugin } from "vite";

/** Emit the same chunks as the explicit imports, exposing their URLs for native-import retry. */
export function featureUrls(): Plugin {
  let build = false;
  let root = "";
  return {
    name: "feature-urls",
    configResolved(config) {
      build = config.command === "build";
      root = config.root;
    },
    resolveId(id) {
      if (id === "virtual:feature-urls") return "\0virtual:feature-urls";
    },
    load(id) {
      if (id !== "\0virtual:feature-urls") return;
      return ["ListImportDialog", "ListExportDialog", "Sort"]
        .map((name) => {
          const source = `/src/components/${name}.tsx`;
          const value = build
            ? `import.meta.ROLLUP_FILE_URL_${this.emitFile({ type: "chunk", id: resolve(root, source.slice(1)) })}`
            : JSON.stringify(source);
          return `export const ${name} = ${value};`;
        })
        .join("\n");
    },
  };
}
