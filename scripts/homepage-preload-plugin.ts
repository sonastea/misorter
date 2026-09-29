import type { Plugin } from "vite";

/** Discover hashed route chunks at build time without eagerly importing the route. */
export function homepagePreload(): Plugin {
  let base = "/";
  return {
    name: "homepage-preload",
    apply: "build",
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: "post",
      handler(_html, { bundle }) {
        if (!bundle) return;
        const home = Object.values(bundle).find(
          (output) =>
            output.type === "chunk" &&
            Object.keys(output.modules).some((id) =>
              id.endsWith("/src/routes/index.tsx?tsr-split=component")
            )
        );
        if (!home) throw new Error("Homepage split chunk was not found");

        const files = new Set<string>();
        const visit = (file: string) => {
          if (files.has(file)) return;
          const chunk = bundle[file];
          if (chunk?.type !== "chunk") return;
          files.add(file);
          // Only static dependencies: optional features stay deferred.
          chunk.imports.forEach(visit);
        };
        visit(home.fileName);
        return [
          {
            tag: "script",
            injectTo: "head-prepend",
            // The SPA shell also serves login/admin URLs. Don't preload Home there.
            children: `if (location.pathname === ${JSON.stringify(new URL(base, "https://build.invalid").pathname)}) {
  for (const href of ${JSON.stringify([...files].map((file) => `${base}${file}`))}) {
    if (document.querySelector('link[rel="modulepreload"][href="' + href + '"]')) continue;
    const link = document.createElement("link");
    link.rel = "modulepreload";
    link.crossOrigin = "";
    link.href = href;
    document.head.appendChild(link);
  }
}`,
          },
        ];
      },
    },
  };
}
