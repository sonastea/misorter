import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

export async function adminFixture(page: Page) {
  await page.route("**/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const results = url.pathname
      .split("/trpc/")[1]
      .split(",")
      .map((name) => ({
        result: {
          data: {
            json:
              name === "auth.getCurrentUser"
                ? { id: "admin" }
                : name === "listing.getAllPaginated"
                  ? {
                      totalCount: 3,
                      listings: ["first", "second", "empty"].map(
                        (label, index) => ({
                          label,
                          title: `List ${label}`,
                          createdAt: "2026-09-28T00:00:00Z",
                          itemCount: index === 2 ? 0 : 2,
                          visitCount: 1,
                          items:
                            index === 2
                              ? []
                              : [
                                  { id: index * 2, value: `${label} A` },
                                  { id: index * 2 + 1, value: `${label} B` },
                                ],
                        })
                      ),
                    }
                  : name === "activity.getRecent"
                    ? { logs: [] }
                    : null,
          },
        },
      }));
    await route.fulfill({
      json: url.searchParams.has("batch") ? results : results[0],
    });
  });
}

test("admin disclosures own delayed mouse, touch, cancellation and row timers", async ({
  page,
  context,
}) => {
  await adminFixture(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/admin/dashboard");
  const labels = page.locator(".adminDashboard-labelTrigger");
  const items = page.locator(".adminDashboard-itemsTrigger");
  await expect(labels).toHaveCount(3);
  await expect(items).toHaveCount(2);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const first = labels.nth(0);
  const second = labels.nth(1);
  await first.dispatchEvent("mouseover");
  await page.clock.runFor(299);
  await expect(page.getByRole("button", { name: "Copy label" })).toHaveCount(0);
  await first.dispatchEvent("mouseout");
  await page.clock.runFor(1);
  await expect(page.getByRole("button", { name: "Copy label" })).toHaveCount(0);
  await first.dispatchEvent("mouseover");
  await page.clock.runFor(300);
  await expect(first.getByRole("button", { name: "Copy label" })).toBeVisible();
  await expect(second.getByRole("button", { name: "Copy label" })).toHaveCount(
    0
  );
  await first.getByRole("button", { name: "Copy label" }).click();
  await expect(first.getByRole("button", { name: "Copy label" })).toHaveCount(
    0
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "first"
  );
  for (const trigger of [first, items.first()]) {
    const disclosure = trigger.locator(
      ".adminDashboard-labelTooltip, .adminDashboard-itemsDropdown"
    );
    await trigger.dispatchEvent("touchstart");
    await page.clock.runFor(499);
    await trigger.dispatchEvent("touchend");
    await page.clock.runFor(1);
    await expect(disclosure).toHaveCount(0);
    await trigger.dispatchEvent("touchstart");
    await page.clock.runFor(500);
    await trigger.dispatchEvent("touchend");
    await expect(disclosure).toBeVisible();
    await trigger.dispatchEvent("touchcancel");
    await expect(disclosure).toHaveCount(0);
    await trigger.dispatchEvent("touchstart");
    await page.clock.runFor(200);
    await trigger.dispatchEvent("touchcancel");
    await page.clock.runFor(500);
    await expect(disclosure).toHaveCount(0);
  }
  await items.first().dispatchEvent("mouseover");
  await page.clock.runFor(199);
  await expect(page.locator(".adminDashboard-itemsDropdown")).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.locator(".adminDashboard-itemsDropdown")).toBeVisible();
  await items.first().dispatchEvent("mouseout");
  await first.dispatchEvent("touchstart");
  await page.getByRole("button", { name: /^Empty/ }).click();
  await expect(labels).toHaveCount(1);
  await page.clock.runFor(500);
  await expect(
    page.locator(".adminDashboard-labelTooltip, .adminDashboard-itemsDropdown")
  ).toHaveCount(0);
});

test("featured owner completes pending open, refreshes empty data and applies one visit", async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let featuredRequests = 0;
  const visits: string[] = [];
  await page.route("**/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const names = url.pathname.split("/trpc/")[1].split(",");
    if (names.includes("listing.getFeatured")) {
      featuredRequests++;
      if (featuredRequests === 1) await pending;
    }
    if (names.includes("listing.createVisit"))
      visits.push(route.request().postData() ?? "");
    const results = names.map((name) => ({
      result: {
        data: {
          json:
            name === "listing.getFeatured"
              ? featuredRequests === 1
                ? []
                : [
                    {
                      label: "featured",
                      title: "Chosen",
                      items: [{ value: "First" }, { value: "Second" }],
                    },
                  ]
              : null,
        },
      },
    }));
    await route.fulfill({
      json: url.searchParams.has("batch") ? results : results[0],
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /trending lists/i }).click();
  release();
  await expect(
    page.getByText("No trending lists yet. Refresh to check again.")
  ).toBeVisible();
  await page.getByRole("button", { name: "Refresh featured lists" }).click();
  await page.getByRole("radio", { name: /Chosen/ }).click();
  await page.getByRole("button", { name: "Try it now" }).click();
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "First"
  );
  await expect(page.getByLabel("Edit item 2", { exact: true })).toHaveValue(
    "Second"
  );
  await expect(page).toHaveURL(/list=featured/);
  await expect.poll(() => visits.length).toBe(1);
  expect(visits[0]).toContain('"source":"FEATURED"');
  expect(featuredRequests).toBe(2);
});

test("admin computed styles match the captured baseline across themes and viewports", async ({
  page,
}) => {
  test.skip(
    !process.env.EFFICIENCY_BASELINE_CSS,
    "Set EFFICIENCY_BASELINE_CSS to the original emitted stylesheet"
  );
  const baseline = readFileSync(process.env.EFFICIENCY_BASELINE_CSS!, "utf8");
  await adminFixture(page);
  for (const route of ["/login", "/admin/dashboard"]) {
    await page.goto(route);
    await expect(
      page.locator(".adminAuth-card, .adminDashboard-card")
    ).toBeVisible();
    if (route.includes("dashboard")) {
      await expect(page.locator(".adminDashboard-labelTrigger")).toHaveCount(3);
      await page
        .getByRole("checkbox", { name: "Select first", exact: true })
        .check();
      await page
        .getByRole("button", { name: "Expand listing details" })
        .first()
        .click();
    }
    for (const width of [1280, 390])
      for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate((theme) => {
          document.documentElement.dataset.theme = theme;
        }, theme);
        const stable = await page.addStyleTag({
          content:
            "*, *::before, *::after { animation: none !important; transition-duration: 0s !important; }",
        });
        const target = page.locator(
          route === "/login"
            ? ".adminAuth-input"
            : ".adminDashboard-searchInput"
        );
        await target.first().focus();
        await page
          .locator(
            route === "/login"
              ? ".adminAuth-submit"
              : ".adminDashboard-expandButton"
          )
          .first()
          .hover();
        const snapshot = () =>
          page.evaluate(() => {
            for (const animation of document.getAnimations()) {
              try {
                animation.finish();
              } catch {
                animation.cancel();
              }
            }
            return Array.from(
              document.querySelectorAll<HTMLElement>(
                '[class*="adminAuth-"], [class*="adminDashboard-"]'
              )
            ).map((element) => {
              const css = getComputedStyle(element);
              return {
                class: element.className,
                styles: Object.fromEntries(
                  [
                    "display",
                    "position",
                    "padding",
                    "margin",
                    "gap",
                    "width",
                    "height",
                    "color",
                    "background-color",
                    "border",
                    "border-radius",
                    "box-shadow",
                    "font-size",
                    "font-weight",
                    "outline",
                    "opacity",
                    "transform",
                    "transition-property",
                    "grid-template-columns",
                  ].map((property) => [
                    property,
                    css.getPropertyValue(property),
                  ])
                ),
              };
            });
          });
        await page.evaluate(() => document.fonts.ready);
        const after = await snapshot();
        await page.evaluate(() =>
          document
            .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
            .forEach((link) => {
              link.disabled = true;
            })
        );
        const beforeSheet = await page.addStyleTag({ content: baseline });
        await page.evaluate(async () => {
          document.body.getBoundingClientRect();
          await document.fonts.ready;
        });
        const before = await snapshot();
        expect(after, `${route} ${width}px ${theme}`).toEqual(before);
        await beforeSheet.evaluate((element) =>
          element.parentNode?.removeChild(element)
        );
        await page.evaluate(() =>
          document
            .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
            .forEach((link) => {
              link.disabled = false;
            })
        );
        await stable.evaluate((element) =>
          element.parentNode?.removeChild(element)
        );
        await page.evaluate(async () => {
          document.body.getBoundingClientRect();
          await document.fonts.ready;
        });
      }
  }
});
