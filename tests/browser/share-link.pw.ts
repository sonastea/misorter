import { expect, test, type Page, type Route } from "@playwright/test";

type Draft = { title: string; items: { value: string }[] };
const source = {
  label: "source",
  title: "Original",
  items: ["Alpha", "Beta", "Gamma", "Delta"].map((value) => ({ value })),
};

async function sharingApi(page: Page) {
  const creates: { route: Route; draft: Draft }[] = [];
  const visits: { label: string; source: string }[] = [];
  const reads: string[] = [];
  await page.route("**/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const names = url.pathname.split("/trpc/")[1].split(",");
    if (names.includes("listing.create")) {
      const input = route.request().postDataJSON() as Record<
        string,
        { json: Draft }
      >;
      creates.push({ route, draft: input["0"].json });
      return;
    }
    if (names.includes("listing.createVisit")) {
      const input = route.request().postDataJSON() as Record<
        string,
        { json: { label: string; source: string } }
      >;
      visits.push(input["0"].json);
    }
    if (names.includes("listing.get")) reads.push(url.href);
    const results = names.map((name) => ({
      result: {
        data: {
          json:
            name === "listing.get"
              ? source
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
  const succeed = async (index: number, label: string) => {
    const { route, draft } = creates[index];
    const response = page.waitForResponse(route.request().url());
    await route.fulfill({
      json: [{ result: { data: { json: { ...draft, label } } } }],
    });
    await (await response).finished();
  };
  return { creates, visits, reads, succeed };
}

async function addList(page: Page) {
  await page.goto("/");
  for (const { value } of source.items) {
    await page
      .getByLabel("Add an item to the list", { exact: true })
      .fill(value);
    await page.getByRole("button", { name: "Add item to the list" }).click();
  }
}

async function backToSetup(page: Page) {
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page.getByRole("button", { name: "Confirm Button" }).click();
  await expect(page.getByLabel("Edit item 1", { exact: true })).toBeVisible();
}

for (const finishFirst of [false, true]) {
  test(`delayed sharing preserves ${finishFirst ? "completed results" : "active battles"}`, async ({
    page,
    context,
  }) => {
    const api = await sharingApi(page);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await addList(page);
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.locator(".sort-gridHeader")).toContainText("Battle #1");
    await expect.poll(() => api.creates.length).toBe(1);
    const share = page.getByRole("button", {
      name: "Share a direct link to this list",
    });
    await expect(share).toBeDisabled();
    await expect(share).toHaveAccessibleDescription("Creating share link…");
    await page.locator(".sort-leftField").click();
    await expect(page.locator(".sort-gridHeader")).toContainText("Battle #2");
    if (finishFirst) {
      for (let battle = 0; battle < 8; battle++) {
        if (await page.getByRole("button", { name: "Show results" }).count())
          break;
        await page.locator(".sort-leftField").click();
      }
      await page.getByRole("button", { name: "Show results" }).click();
      await expect(page.getByRole("row")).toHaveCount(5);
    }
    const progress = await page.locator(".sort-gridHeader").innerText();
    const choices = await page
      .locator("#leftField, #rightField")
      .allTextContents();
    const rows = await page.getByRole("row").allTextContents();
    const sorter = await page.locator(".sort-container").elementHandle();
    await api.succeed(0, "created");
    await expect(share).toBeEnabled();
    await expect(page).toHaveURL(/list=created/);
    await expect(page.locator(".sort-gridHeader")).toHaveText(progress, {
      useInnerText: true,
    });
    expect(
      await page.locator("#leftField, #rightField").allTextContents()
    ).toEqual(choices);
    expect(await page.getByRole("row").allTextContents()).toEqual(rows);
    expect(await sorter?.evaluate((element) => element.isConnected)).toBe(true);
    await share.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      page.url()
    );
    await expect
      .poll(() => api.visits)
      .toEqual([{ label: "created", source: "NEW" }]);
    expect(api.reads).toEqual([]);
    await backToSetup(page);
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.locator(".sort-gridHeader")).toContainText("Battle #1");
    await expect(share).toBeEnabled();
    expect(api.creates).toHaveLength(1);
  });
}

for (const failure of ["BAD_REQUEST", "INTERNAL_SERVER_ERROR", "network"]) {
  test(`sharing failure (${failure}) leaves sorting usable and sharing unavailable`, async ({
    page,
  }) => {
    const api = await sharingApi(page);
    await addList(page);
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect.poll(() => api.creates.length).toBe(1);
    await page.locator(".sort-leftField").click();
    const progress = await page.locator(".sort-gridHeader").innerText();
    if (failure === "network") {
      await api.creates[0].route.abort("failed");
    } else {
      const status = failure === "BAD_REQUEST" ? 400 : 500;
      await api.creates[0].route.fulfill({
        status,
        json: [
          {
            error: {
              json: {
                message: "Creation failed",
                code: failure === "BAD_REQUEST" ? -32600 : -32603,
                data: { code: failure, httpStatus: status },
              },
            },
          },
        ],
      });
    }
    const share = page.getByRole("button", {
      name: "Share a direct link to this list",
    });
    await expect(share).toHaveAccessibleDescription("Share link unavailable");
    await expect(share).toBeDisabled();
    await expect(page.getByText(/Unable to create link to list/)).toBeVisible();
    await expect(page.locator(".sort-gridHeader")).toHaveText(progress, {
      useInnerText: true,
    });
    await page.locator(".sort-leftField").click();
    await expect(page.locator(".sort-gridHeader")).toContainText("Battle #3");
    expect(new URL(page.url()).searchParams.has("list")).toBe(false);
    expect(api.visits).toEqual([]);
  });
}

test("returning and restarting during creation reuses the request without forcing sorting on completion", async ({
  page,
}) => {
  const api = await sharingApi(page);
  await addList(page);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect.poll(() => api.creates.length).toBe(1);
  await backToSetup(page);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator(".sort-gridHeader")).toContainText("Battle #1");
  await backToSetup(page);
  await api.succeed(0, "created");
  await expect(page).toHaveURL(/list=created/);
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Delta"
  );
  await expect(page.locator(".sort-container")).toHaveCount(0);
  expect(api.creates).toHaveLength(1);
});

test("out-of-order responses cannot attach an older draft or reset its replacement", async ({
  page,
}) => {
  const api = await sharingApi(page);
  await page.goto("/?list=source");
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Alpha"
  );
  await page.getByLabel("Edit item 1", { exact: true }).fill("First draft");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect.poll(() => api.creates.length).toBe(1);
  const share = page.getByRole("button", {
    name: "Share a direct link to this list",
  });
  await expect(share).toBeDisabled();
  await backToSetup(page);
  await page.getByLabel("Edit item 1", { exact: true }).fill("Second draft");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect.poll(() => api.creates.length).toBe(2);
  await page.locator(".sort-leftField").click();
  const progress = await page.locator(".sort-gridHeader").innerText();
  await api.succeed(1, "newer");
  await expect(page).toHaveURL(/list=newer/);
  await expect(share).toBeEnabled();
  await api.succeed(0, "older");
  await expect(page.locator(".sort-gridHeader")).toHaveText(progress, {
    useInnerText: true,
  });
  await expect(page).toHaveURL(/list=newer/);
  await expect
    .poll(() => api.visits)
    .toEqual([
      { label: "source", source: "URL" },
      { label: "newer", source: "NEW" },
    ]);
  expect(api.reads).toHaveLength(1);
  await backToSetup(page);
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Second draft"
  );
});

for (const replacement of ["edit", "import", "navigation"]) {
  test(`late creation ignores a subsequent ${replacement}`, async ({
    page,
  }) => {
    const api = await sharingApi(page);
    await addList(page);
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect.poll(() => api.creates.length).toBe(1);
    await backToSetup(page);
    let expected = "Local edit";
    if (replacement === "edit") {
      await page.getByLabel("Edit item 1", { exact: true }).fill(expected);
    } else if (replacement === "import") {
      expected = "Imported";
      await page
        .getByRole("button", { name: "Import list", exact: true })
        .click();
      await page.getByLabel("Paste list").fill("Imported\nReplacement");
      await page.getByRole("button", { name: "Preview list" }).click();
      await page.getByRole("button", { name: /^Use imported list/ }).click();
    } else {
      expected = "Alpha";
      await page.evaluate(() => {
        history.pushState(null, "", "/?list=source");
        dispatchEvent(new PopStateEvent("popstate"));
      });
    }
    await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
      expected
    );
    const url = page.url();
    await api.succeed(0, "obsolete");
    await expect(page).toHaveURL(url);
    await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
      expected
    );
    await expect(page.locator(".sort-container")).toHaveCount(0);
    await expect(
      page.getByText("Successfully created link to list.")
    ).toHaveCount(0);
    expect(api.visits.some(({ source }) => source === "NEW")).toBe(false);
  });
}
