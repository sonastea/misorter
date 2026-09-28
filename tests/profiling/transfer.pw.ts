import { test, expect, type Page } from "@playwright/test";

type Sample = { name: string; duration: number };
async function samples(page: Page) {
  return page.evaluate(() => {
    const target = globalThis as typeof globalThis & {
      __transferProfile?: { name: string; duration: number }[];
    };
    return (target.__transferProfile ??= []).splice(0);
  });
}
function summarize(rows: Sample[]) {
  const result: Record<string, { calls: number; totalMs: number }> = {};
  for (const { name, duration } of rows) {
    const item = (result[name] ??= { calls: 0, totalMs: 0 });
    item.calls++;
    item.totalMs += duration;
  }
  return result;
}
for (const size of [10, 1000])
  test(`transfer profile ${size} items`, async ({ page, context }, info) => {
    const items = Array.from({ length: size }, (_, index) => ({
      value: size === 1000 ? `${index} ${"x".repeat(990)}` : `Item ${index}`,
    }));
    const draft = { title: "Profile", items };
    const observations: Record<string, ReturnType<typeof summarize>> = {};
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
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
                  ? { label: "profile", ...draft }
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
    await page.goto("/?list=profile");
    await expect(page.getByLabel("Edit item 1", { exact: true })).toBeVisible();
    await samples(page);
    await page
      .getByRole("button", { name: "Export list", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Download JSON" })
    ).toBeEnabled();
    observations.exportOpen = summarize(await samples(page));
    await page
      .getByRole("button", { name: "Copy to clipboard", exact: true })
      .click();
    await expect(page.getByText("JSON copied to clipboard.")).toBeVisible();
    observations.copyFeedback = summarize(await samples(page));
    await page.getByLabel("Export format").selectOption("text");
    observations.formatChange = summarize(await samples(page));
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Import list", exact: true })
      .click();
    await page
      .getByLabel("Paste list")
      .fill(JSON.stringify({ format: "misorter-list", version: 1, ...draft }));
    await samples(page);
    await page
      .getByRole("button", { name: "Preview list", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: /^Use imported list/ })
    ).toBeEnabled();
    observations.preview = summarize(await samples(page));
    if (size === 1000) {
      await page
        .getByRole("button", { name: "Next items", exact: true })
        .click();
      observations.pagination = summarize(await samples(page));
    }
    await page.getByLabel("Import format").selectOption("text");
    observations.sourceOption = summarize(await samples(page));
    await page
      .getByRole("textbox", { name: /^Item \d+ / })
      .first()
      .fill("Edited item");
    observations.itemEdit = summarize(await samples(page));
    console.log(
      JSON.stringify({
        size,
        canonicalBytes: Buffer.byteLength(
          JSON.stringify(
            { format: "misorter-list", version: 1, ...draft },
            null,
            2
          ) + "\n"
        ),
        observations,
      })
    );
    await info.attach(`profile-${size}.json`, {
      body: JSON.stringify(observations, null, 2),
      contentType: "application/json",
    });
  });
