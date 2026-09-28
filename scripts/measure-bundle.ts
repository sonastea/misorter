import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const dist = process.argv[2] ?? "dist";

type Entry = { file: string; imports?: string[]; css?: string[] };
const manifest: Record<string, Entry> = JSON.parse(
  readFileSync(join(dist, ".vite/manifest.json"), "utf8")
);
const inventory: Record<string, string[]> = JSON.parse(
  readFileSync(join(dist, "module-inventory.json"), "utf8")
);
const keyFor = (module: string) => {
  const key = Object.keys(manifest).find((key) =>
    inventory[manifest[key].file]?.some((id) => id.endsWith(module))
  );
  if (!key) throw new Error(`Module absent from inventory: ${module}`);
  return key;
};
function assets(keys: (string | undefined)[]) {
  const files = new Set<string>();
  const seen = new Set<string>();
  function visit(key: string) {
    if (seen.has(key)) return;
    seen.add(key);
    const entry = manifest[key];
    files.add(entry.file);
    entry.css?.forEach((file) => files.add(file));
    entry.imports?.forEach(visit);
  }
  keys.forEach((key) => {
    if (key) visit(key);
  });
  return [...files];
}
function measure(files: string[]) {
  return Object.fromEntries(
    ["js", "css"].map((ext) => {
      const selected = files.filter((file) => file.endsWith(`.${ext}`));
      return [
        ext,
        {
          bytes: selected.reduce(
            (n, file) => n + statSync(join(dist, file)).size,
            0
          ),
          gzip: selected.reduce(
            (n, file) =>
              n + gzipSync(readFileSync(join(dist, file)), { level: 9 }).length,
            0
          ),
          files: selected,
        },
      ];
    })
  );
}
const groups = {
  homepage: assets([
    "index.html",
    keyFor("/src/routes/index.tsx?tsr-split=component"),
  ]),
  login: assets([
    "index.html",
    keyFor("/src/routes/login.tsx?tsr-split=component"),
  ]),
  dashboard: assets([
    "index.html",
    keyFor(
      "/src/routes/_authenticated/_admin/admin/dashboard.tsx?tsr-split=component"
    ),
  ]),
  import: assets([keyFor("/src/components/ListImportDialog.tsx")]),
  export: assets([keyFor("/src/components/ListExportDialog.tsx")]),
  sort: assets([keyFor("/src/components/Sort.tsx")]),
  total: readdirSync(join(dist, "assets")).map((file) => `assets/${file}`),
};
for (const feature of ["import", "export", "sort"] as const) {
  groups[feature] = groups[feature].filter(
    (file) => !groups.homepage.includes(file)
  );
}
console.log(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(groups).map(([name, files]) => [name, measure(files)])
    ),
    null,
    2
  )
);
