import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const names = url.pathname.split("/trpc/")[1].split(",");
    const results = names.map((name) => ({
      result: {
        data: {
          json:
            name === "listing.get"
              ? {
                  label: "source",
                  title: "Original",
                  items: [{ value: "First" }, { value: "Second" }],
                }
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
});

test("keyboard editing announces repairable errors and restores focus", async ({
  page,
}) => {
  await page.goto("/");
  const title = page.getByRole("button", { name: "Edit list title: misorter" });
  const pencil = page.getByRole("button", { name: "Edit title", exact: true });
  const input = page.getByRole("textbox", { name: "Edit list title" });

  await title.focus();
  await page.keyboard.press("Space");
  await expect(input).toBeFocused();
  expect(
    await input.evaluate((element: HTMLInputElement) => [
      element.selectionStart,
      element.selectionEnd,
    ])
  ).toEqual([0, "misorter".length]);
  await expect(input).toHaveAccessibleDescription(
    "Enter to save, Esc to cancel"
  );

  await input.fill(" ");
  await page.getByRole("button", { name: "Save title" }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert")).toHaveText("Enter a nonblank value.");
  await expect(input).toHaveAccessibleDescription(/Enter a nonblank value\./);

  await input.fill("My ranked list");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await input.dispatchEvent("keydown", { key: "Enter", isComposing: true });
  await expect(input).toBeVisible();
  await input.press("Enter");
  await expect(pencil).toBeFocused();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "My ranked list"
  );

  await page.keyboard.press("Enter");
  await input.fill("Unsaved change");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Save title" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(pencil).toBeFocused();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "My ranked list"
  );
});

test("double-click and the visible pencil both open the editor", async ({
  page,
}) => {
  await page.goto("/");
  const title = page.getByRole("button", { name: "Edit list title: misorter" });
  const input = page.getByRole("textbox", { name: "Edit list title" });
  await expect(title).toHaveAccessibleDescription(
    "Double-click or double-tap to edit"
  );
  await title.click();
  await expect(input).toHaveCount(0);
  await title.dblclick();
  await expect(input).toBeFocused();
  await page.getByRole("button", { name: "Cancel edit" }).click();
  await page.getByRole("button", { name: "Edit title", exact: true }).click();
  await expect(input).toBeFocused();
});

test("general tips appear automatically, remain readable and are dismissed once", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const title = page.getByRole("button", { name: "Edit list title: misorter" });
  const pencil = page.getByRole("button", { name: "Edit title", exact: true });
  const hint = page.getByRole("complementary", { name: "Quick tips" });
  await expect(pencil).toHaveCSS("opacity", "0");
  const titleBox = await title.boundingBox();
  const inputBox = await page
    .getByLabel("Add an item to the list")
    .boundingBox();

  // The general introduction appears without a hover and never moves focus.
  await page.clock.runFor(1000);
  await expect(hint).toBeVisible();
  expect(
    await page.evaluate(() => document.activeElement === document.body)
  ).toBe(true);
  await expect(hint.getByRole("heading", { level: 3 })).toHaveText([
    "Name your list",
    "Add and rank",
    "Choose carefully",
  ]);
  await expect(pencil).toHaveCSS("opacity", "1");
  expect(await title.boundingBox()).toEqual(titleBox);
  expect(
    await page.getByLabel("Add an item to the list").boundingBox()
  ).toEqual(inputBox);

  await pencil.hover();
  await page.clock.runFor(300);
  await expect(hint).toBeVisible();
  const hintBox = await hint.boundingBox();
  if (!hintBox) throw new Error("Quick tips are not visible");
  // Pause in the physical gap to verify the invisible hover bridge.
  await page.mouse.move(hintBox.x + hintBox.width / 2, hintBox.y + 3, {
    steps: 8,
  });
  await page.clock.runFor(500);
  await expect(hint).toBeVisible();
  await page.getByRole("button", { name: "Dismiss quick tips" }).hover();
  await page.clock.runFor(500);
  await expect(pencil).toHaveCSS("opacity", "1");

  await page.mouse.move(0, 400);
  await page.clock.runFor(1000);
  await expect(hint).toBeVisible();
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await expect(hint).toHaveCount(0);
  await expect(pencil).toBeFocused();
  await page.reload();
  await expect(pencil).toHaveCSS("opacity", "0");
  await title.hover();
  await page.clock.runFor(1000);
  await expect(pencil).toHaveCSS("opacity", "1");
  await expect(hint).toHaveCount(0);
  await page.mouse.move(0, 500);
  await page.clock.runFor(150);
  await expect(pencil).toHaveCSS("opacity", "1");
  await page.clock.runFor(150);
  await expect(pencil).toHaveCSS("opacity", "0");
});

test("keyboard focus reveals editing and Escape dismisses the one-time tip", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const title = page.getByRole("button", { name: "Edit list title: misorter" });
  const pencil = page.getByRole("button", { name: "Edit title", exact: true });
  const hint = page.getByRole("complementary", { name: "Quick tips" });
  await title.focus();
  await page.clock.runFor(1000);
  await expect(hint).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(pencil).toBeFocused();
  await expect(pencil).toHaveCSS("opacity", "1");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Dismiss quick tips" })
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(hint).toHaveCount(0);
  await expect(pencil).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Add an item to the list")).toBeFocused();
  await expect(pencil).toHaveCSS("opacity", "0");
  await page.reload();
  await title.focus();
  await page.clock.runFor(1000);
  await expect(hint).toHaveCount(0);
});

test("the discovery tip stays out of loaded lists and active drafts", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/?list=source");
  await page.getByRole("button", { name: "Edit list title: Original" }).hover();
  await page.clock.runFor(1000);
  await expect(
    page.getByRole("complementary", { name: "Quick tips" })
  ).toHaveCount(0);
  await page.goto("/");
  await page.getByLabel("Add an item to the list").fill("An item in progress");
  await page.getByRole("button", { name: "Edit list title: misorter" }).hover();
  await page.clock.runFor(1000);
  await expect(
    page.getByRole("complementary", { name: "Quick tips" })
  ).toHaveCount(0);
});

test("general tips and featured discovery get separate visits", async ({
  page,
}) => {
  await page.clock.install();
  await page.route("**/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const names = url.pathname.split("/trpc/")[1].split(",");
    if (!names.includes("listing.getFeatured")) {
      await route.fallback();
      return;
    }
    const results = names.map((name) => ({
      result: {
        data: {
          json:
            name === "listing.getFeatured"
              ? [
                  {
                    label: "popular",
                    title: "Popular",
                    items: [{ value: "One" }, { value: "Two" }],
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
  const loaded = page.waitForResponse((response) =>
    response.url().includes("listing.getFeatured")
  );
  await page.goto("/");
  await loaded;
  await page.clock.runFor(1000);
  const tips = page.getByRole("complementary", { name: "Quick tips" });
  const discovery = page.getByRole("complementary", {
    name: "Discover trending lists",
  });
  await expect(tips).toBeVisible();
  await expect(discovery).toHaveCount(0);
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await page.clock.runFor(2000);
  await expect(discovery).toHaveCount(0);
  const reloaded = page.waitForResponse((response) =>
    response.url().includes("listing.getFeatured")
  );
  await page.reload();
  await reloaded;
  await page.clock.runFor(1200);
  await expect(discovery).toBeVisible();
  await expect(tips).toHaveCount(0);
});

test("starting another action cancels the pending introduction", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  await page.clock.runFor(1500);
  await expect(page.getByRole("dialog", { name: "Import list" })).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Quick tips" })
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.clock.runFor(1500);
  await expect(
    page.getByRole("complementary", { name: "Quick tips" })
  ).toHaveCount(0);
});

test("pending saves keep the editor open and a failed save can be retried", async ({
  page,
}) => {
  let release: () => void = () => {
    throw new Error("Save did not begin");
  };
  let saves = 0;
  await page.route("**/trpc/listing.updateTitle**", async (route) => {
    saves += 1;
    if (saves === 1) {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({
        status: 500,
        json: [
          {
            error: {
              json: {
                message: "Could not save. Try again.",
                code: -32603,
                data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
              },
            },
          },
        ],
      });
    } else {
      await route.fulfill({
        json: [
          {
            result: {
              data: {
                json: {
                  label: "source",
                  title: "Updated",
                  items: [{ value: "First" }, { value: "Second" }],
                },
              },
            },
          },
        ],
      });
    }
  });
  await page.goto("/?list=source");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Original");
  await page.getByRole("button", { name: "Edit list title: Original" }).hover();
  await page.getByRole("button", { name: "Edit title", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Edit list title" });
  await input.fill("Updated");
  const saving = page.waitForRequest((request) =>
    request.url().includes("listing.updateTitle")
  );
  await input.press("Enter");
  await saving;
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await expect(
    page.getByRole("status").filter({ hasText: "Saving list title" })
  ).toBeVisible();
  await expect(input).toHaveAttribute("readonly", "");
  await input.press("Escape");
  await input.press("Enter");
  await expect(input).toBeVisible();
  expect(saves).toBe(1);
  release();
  await expect(page.getByRole("alert")).toHaveText(
    "Could not save. Try again."
  );
  await expect(input).toHaveValue("Updated");
  await expect(input).toBeFocused();
  await expect(input).toBeEditable();
  await input.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Updated");
  await expect(
    page.getByRole("button", { name: "Edit title", exact: true })
  ).toBeFocused();
  expect(saves).toBe(2);
});

test.describe("touch editing", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 320, height: 740 },
  });

  test("double-tap and pencil work in both themes with long titles", async ({
    page,
  }) => {
    await page.goto("/");
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (value) => document.documentElement.setAttribute("data-theme", value),
        theme
      );
      const title = page.getByRole("heading", { level: 1 }).getByRole("button");
      const input = page.getByRole("textbox", { name: "Edit list title" });
      await expect(
        page.getByRole("button", { name: "Edit title", exact: true })
      ).toHaveCSS("opacity", "1");
      const box = await title.boundingBox();
      if (!box) throw new Error("Title is not visible");
      await page.touchscreen.tap(box.x + box.width / 2, box.y + 15);
      await expect(input).toHaveCount(0);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + 15);
      await expect(input).toBeFocused();
      await page.getByRole("button", { name: "Cancel edit" }).tap();
      const pencil = page.getByRole("button", {
        name: "Edit title",
        exact: true,
      });
      await pencil.tap();
      await expect(input).toBeFocused();
      await input.fill("Long".repeat(60));
      await page.getByRole("button", { name: "Save title" }).tap();
      await expect(title).toHaveText("Long".repeat(60));
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth
        )
      ).toBe(true);
      const pencilBox = await pencil.boundingBox();
      expect(pencilBox?.height).toBeGreaterThanOrEqual(44);
      expect(pencilBox?.width).toBeGreaterThanOrEqual(44);
    }
  });
});
