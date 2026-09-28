import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

type Entry = { file: string; imports?: string[]; css?: string[] };
const manifest: Record<string, Entry> = JSON.parse(
  readFileSync("dist/.vite/manifest.json", "utf8")
);
const modules: Record<string, string[]> = JSON.parse(
  readFileSync("dist/module-inventory.json", "utf8")
);
const fileFor = (name: string) => {
  const file = Object.keys(modules).find((file) =>
    modules[file].some((id) => id.endsWith(name))
  );
  if (!file) throw new Error(`Missing module: ${name}`);
  return file;
};
const feature = {
  import: fileFor("/src/components/ListImportDialog.tsx"),
  export: fileFor("/src/components/ListExportDialog.tsx"),
  sort: fileFor("/src/components/Sort.tsx"),
};
const draft = {
  label: "source",
  title: "Original",
  items: [{ value: "Zulu" }, { value: "Alpha" }],
};
async function api(page: Page) {
  await page.route("**/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const results = url.pathname
      .split("/trpc/")[1]
      .split(",")
      .map((name) => ({
        result: {
          data: {
            json:
              name === "listing.get"
                ? draft
                : name === "listing.getFeatured"
                  ? []
                  : null,
          },
        },
      }));
    await route.fulfill({
      json: url.searchParams.has("batch") ? results : results[0],
    });
  });
}
function latch() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

test("cold public graph and requests exclude optional JS and admin CSS", async ({
  page,
}) => {
  const seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const entry = Object.values(manifest).find((entry) => entry.file === file);
    entry?.css?.forEach((css) => seen.add(css));
    entry?.imports?.forEach((key) => visit(manifest[key].file));
  };
  visit(manifest["index.html"].file);
  visit(fileFor("/src/routes/index.tsx?tsr-split=component"));
  for (const file of Object.values(feature)) expect(seen.has(file)).toBe(false);
  // Retry cache-busts only the entry: its static dependencies must already be in
  // the successfully loaded homepage graph, never another failed optional module.
  for (const file of Object.values(feature)) {
    const entry = Object.values(manifest).find((entry) => entry.file === file)!;
    for (const key of entry.imports ?? [])
      expect(seen.has(manifest[key].file)).toBe(true);
  }
  for (const file of seen) {
    expect(modules[file]?.some((id) => id.includes("csv-parse")) ?? false).toBe(
      false
    );
    if (file.endsWith(".css"))
      expect(readFileSync(`dist/${file}`, "utf8")).not.toMatch(
        /adminAuth-|adminDashboard-/
      );
  }
  const requested: string[] = [];
  page.on("request", (request) =>
    requested.push(new URL(request.url()).pathname.slice(1))
  );
  await api(page);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Import list", exact: true })
  ).toBeVisible();
  for (const file of Object.values(feature))
    expect(requested).not.toContain(file);
  const adminCss = Object.values(manifest)
    .flatMap((entry) => entry.css ?? [])
    .filter((file) =>
      readFileSync(`dist/${file}`, "utf8").includes("adminAuth-")
    );
  expect(new Set(adminCss).size).toBe(1);
  for (const file of adminCss) expect(requested).not.toContain(file);
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Admin Login" })
  ).toBeVisible();
  for (const file of adminCss) expect(requested).toContain(file);
});

test("slow export captures the click snapshot and canceled import never opens", async ({
  page,
}) => {
  await api(page);
  const exportGate = latch();
  await page.route(`**/${feature.export}`, async (route) => {
    await exportGate.promise;
    await route.continue();
  });
  await page.goto("/?list=source");
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Zulu"
  );
  const trigger = page.getByRole("button", {
    name: "Export list",
    exact: true,
  });
  await trigger.click();
  await expect(page.getByRole("status")).toContainText("Loading export");
  await expect(trigger).toBeFocused();
  await page.getByLabel("Edit item 1", { exact: true }).fill("Later edit");
  exportGate.release();
  await expect(page.getByRole("dialog")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON" }).click();
  const path = await (await download).path();
  expect(JSON.parse(readFileSync(path!, "utf8")).items[0].value).toBe("Zulu");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  const importGate = latch();
  await page.route(`**/${feature.import}`, async (route) => {
    await importGate.promise;
    await route.continue();
  });
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  await page.getByRole("button", { name: "Cancel import" }).click();
  const loaded = page.waitForResponse((response) =>
    response.url().endsWith(feature.import)
  );
  importGate.release();
  await loaded;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Later edit"
  );
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  await expect(page.getByLabel("Paste list")).toBeVisible();
});

test("unavailable first use preserves the draft, retries online, then works offline", async ({
  page,
  context,
}) => {
  await api(page);
  await page.goto("/?list=source");
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Zulu"
  );
  await context.setOffline(true);
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not load import");
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Zulu"
  );
  await expect(page).toHaveURL(/list=source/);
  await context.setOffline(false);
  await page.getByRole("button", { name: "Retry import" }).click();
  await expect(page.getByLabel("Paste list")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Import list", exact: true })
  ).toBeFocused();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  await page.getByLabel("Paste list").fill("One\nTwo");
  await page.getByRole("button", { name: "Preview list", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Use imported list/ })
  ).toBeEnabled();
});

test("Start cancellation has no persistence and delayed Start revalidates current edits", async ({
  page,
}) => {
  await api(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") writes.push(request.url());
  });
  const gate = latch();
  await page.route(`**/${feature.sort}`, async (route) => {
    await gate.promise;
    await route.continue();
  });
  await page.goto("/");
  for (const value of ["Alpha", "Zulu"]) {
    await page
      .getByLabel("Add an item to the list", { exact: true })
      .fill(value);
    await page
      .getByRole("button", { name: "Add item to the list", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Cancel sorting" }).click();
  expect(writes).toEqual([]);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByLabel("Edit item 1", { exact: true }).fill(" ");
  gate.release();
  await expect(page.getByRole("alert")).toContainText("nonblank");
  expect(writes).toEqual([]);
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    " "
  );
});

test("protected dashboard preserves login redirect intent", async ({
  page,
}) => {
  await api(page);
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fdashboard/);
  await expect(
    page.getByRole("heading", { name: "Admin Login" })
  ).toBeVisible();
});

test("failed sorting and export chunks retry without losing the running session", async ({
  page,
}) => {
  await api(page);
  await page.route("https://id.twitch.tv/**", (route) =>
    route.fulfill({ status: 401, json: { status: 401 } })
  );
  let sortAttempts = 0;
  let exportAttempts = 0;
  await page.route(`**/${feature.sort}*`, (route) =>
    ++sortAttempts === 1 ? route.abort("failed") : route.continue()
  );
  await page.route(`**/${feature.export}*`, (route) =>
    ++exportAttempts === 1 ? route.abort("failed") : route.continue()
  );
  await page.goto("/?list=source");
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Zulu"
  );
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not load sorting");
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Zulu"
  );
  await page.getByRole("button", { name: "Retry sorting" }).click();
  const progress = await page.locator(".sort-gridHeader").innerText();
  await page
    .getByRole("button", { name: "Export input list", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Could not load export");
  await page.getByRole("button", { name: "Retry export" }).click();
  await expect(
    page.getByRole("button", { name: "Download JSON" })
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sort-gridHeader")).toHaveText(progress, {
    useInnerText: true,
  });
  expect(sortAttempts).toBe(2);
  expect(exportAttempts).toBe(2);
});

test("a departed setup ignores its load and returning starts a fresh session without another visit", async ({
  page,
}) => {
  await api(page);
  await page.route("https://id.twitch.tv/**", (route) =>
    route.fulfill({ status: 401, json: { status: 401 } })
  );
  const gate = latch();
  let sortDownloads = 0;
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(feature.sort)) sortDownloads++;
    if (request.method() === "POST") writes.push(request.url());
  });
  await page.route(`**/${feature.import}`, async (route) => {
    await gate.promise;
    await route.continue();
  });
  await page.goto("/?list=source");
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Zulu"
  );
  await expect.poll(() => writes.length).toBe(1);
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Export input list", exact: true })
  ).toBeVisible();
  const loaded = page.waitForResponse((response) =>
    response.url().endsWith(feature.import)
  );
  gate.release();
  await loaded;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByText("Alpha", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Show results", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm Button", exact: true })
    .click();
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Zulu"
  );
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByText("Alpha", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Show results", exact: true })
  ).toHaveCount(0);
  expect(sortDownloads).toBe(1);
  expect(writes).toHaveLength(1);
});
