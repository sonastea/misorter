import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const results = url.pathname
      .split("/trpc/")[1]
      .split(",")
      .map((name) => ({
        result: {
          data: {
            json: name === "listing.getFeatured" ? [] : null,
          },
        },
      }));
    await route.fulfill({
      json: url.searchParams.has("batch") ? results : results[0],
    });
  });
});

test("support shell opens immediately, lazy-loads its fields and preserves drafts", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const dialogModule =
    /\/(?:src\/components\/SupportFormContent\.tsx|assets\/SupportFormContent-[^/]+\.js)(?:\?.*)?$/;
  await page.route(dialogModule, async (route) => {
    await pending;
    await route.continue();
  });

  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Help & Feedback",
    exact: true,
  });
  await expect(trigger).toBeVisible();
  const dialogRequests = () => requests.filter((url) => dialogModule.test(url));
  expect(dialogRequests()).toHaveLength(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Help & Feedback Form" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".supportForm-loading")).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText("Loading support form");
  await expect(dialog.locator(".supportForm-loadingLabel")).toHaveCSS(
    "clip-path",
    "inset(50%)"
  );
  await expect(
    page.locator(".supportForm-container > [role='status']")
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Close support form" })
  ).toBeFocused();
  const loadingHeight = await dialog
    .locator(".supportForm-panel")
    .evaluate((panel) => panel.clientHeight);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      await expect(dialog.locator(".supportForm-loading")).toBeVisible();
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= window.innerWidth
        )
      ).toBe(true);
    }
  }

  // Closing during a slow download must still work and must not reopen later.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  const loaded = page.waitForResponse((response) =>
    dialogModule.test(response.url())
  );
  release();
  await loaded;
  await expect(dialog).toHaveCount(0);
  await trigger.click();

  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".supportForm-loading")).toHaveCount(0);
  const loadedHeight = await dialog
    .locator(".supportForm-panel")
    .evaluate((panel) => panel.clientHeight);
  expect(Math.abs(loadedHeight - loadingHeight)).toBeLessThanOrEqual(4);
  await page.getByRole("tab", { name: "Feedback", exact: true }).click();
  await page.getByLabel("Topic", { exact: true }).selectOption("Bug report");
  await page.getByLabel("Message", { exact: true }).fill("An unfinished draft");
  await page.getByLabel("Email (optional)").fill("person@example.com");
  await page.getByRole("button", { name: "Close support form" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Feedback", exact: true })
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Topic", { exact: true })).toHaveValue(
    "Bug report"
  );
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "An unfinished draft"
  );
  await expect(page.getByLabel("Email (optional)")).toHaveValue(
    "person@example.com"
  );
  expect(dialogRequests()).toHaveLength(1);

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("lazy support form submits trimmed values and resets after success", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Help & Feedback",
    exact: true,
  });
  await trigger.click();
  await page
    .getByLabel("Message", { exact: true })
    .fill("  I need help with my list.  ");
  await page.getByLabel("Email (optional)").fill("person@example.com");
  const submitted = page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().includes("support.submit")
  );
  await page
    .getByRole("button", { name: "Send for Help", exact: true })
    .click();
  const body: unknown = (await submitted).postDataJSON();
  expect(body).toEqual({
    "0": {
      json: {
        type: "help",
        topic: "General",
        message: "I need help with my list.",
        email: "person@example.com",
      },
    },
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await trigger.click();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Email (optional)")).toHaveValue("");
  await expect(page.getByLabel("Topic", { exact: true })).toHaveValue(
    "General"
  );
});
