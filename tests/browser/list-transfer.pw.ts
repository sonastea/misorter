import { expect, test, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";

const native = (title: string, values: string[]) =>
  JSON.stringify({
    format: "misorter-list",
    version: 1,
    title,
    items: values.map((value) => ({ value })),
  });

async function sourceRoutes(page: Page) {
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
                  items: [{ value: "Zulu" }, { value: "Alpha" }],
                }
              : name === "listing.create"
                ? {
                    label: "fresh",
                    title: "Local title",
                    items: [{ value: "Beta" }, { value: "Gamma" }],
                  }
                : name.includes("featured") || name.includes("Featured")
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

async function preview(page: Page, title: string, values: string[]) {
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  await page.getByLabel("Paste list").fill(native(title, values));
  await page.getByRole("button", { name: "Preview list", exact: true }).click();
}

async function exportList(page: Page, sorting = false) {
  await page
    .getByRole("button", {
      name: sorting ? "Export input list" : "Export list",
      exact: true,
    })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON" }).click();
  const file = await download;
  const path = await file.path();
  if (!path) throw new Error("Download missing");
  const text = await readFile(path, "utf8");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  return {
    text,
    name: file.suggestedFilename(),
    document: JSON.parse(text) as { title: string; items: { value: string }[] },
  };
}

test("clipboard copies the selected export format and recovers from a denied write", async ({
  page,
  context,
}) => {
  await sourceRoutes(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await preview(page, "Clipboard list", ["Zulu", "=1+1"]);
  await page.getByRole("button", { name: /^Use imported list/ }).click();
  await page.getByRole("button", { name: "Export list", exact: true }).click();
  const copyButton = page.getByRole("button", {
    name: "Copy to clipboard",
    exact: true,
  });
  const copyPosition = await copyButton.boundingBox();
  await copyButton.click();
  await expect(page.getByRole("status")).toHaveText(
    "JSON copied to clipboard."
  );
  expect(await copyButton.boundingBox()).toEqual(copyPosition);
  expect(
    JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))
  ).toEqual({
    format: "misorter-list",
    version: 1,
    title: "Clipboard list",
    items: [{ value: "Zulu" }, { value: "=1+1" }],
  });
  await page.getByLabel("Export format").selectOption("csv");
  await expect(
    page.getByText("JSON copied to clipboard.", { exact: true })
  ).toHaveCount(0);
  await copyButton.click();
  await expect(
    page.getByText("CSV copied to clipboard.", { exact: true })
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "title,value\r\nClipboard list,Zulu\r\nClipboard list,'=1+1\r\n"
  );
  await page.getByLabel("Export format").selectOption("text");
  await page.evaluate(() => {
    const write = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = async (text: string) => {
      navigator.clipboard.writeText = write;
      throw new DOMException(`Denied ${text.length} bytes`, "NotAllowedError");
    };
  });
  await copyButton.click();
  await expect(page.getByRole("alert")).toContainText("Could not copy");
  await expect(copyButton).toBeEnabled();
  await copyButton.click();
  await expect(page.getByRole("status")).toHaveText(
    "Plain text copied to clipboard."
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "Zulu\n=1+1\n"
  );
});

test("CSV mapping, conflicting title repair and actual spreadsheet/text downloads", async ({
  page,
}) => {
  await sourceRoutes(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  await page
    .getByLabel("Paste list")
    .fill("title,name,item\nOne,unused,Alpha\nTwo,unused,Beta");
  await page.getByLabel("Import format").selectOption("csv");
  await page.getByRole("button", { name: "Preview list", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Choose the column");
  await page.getByLabel("Item column", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Preview list", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("different titles");
  await expect(
    page.getByRole("button", { name: /^Use imported list/ })
  ).toBeDisabled();
  await page.getByLabel("Preview title").fill("Chosen");
  await page.getByRole("textbox", { name: /^Item 2 / }).fill("=SUM(1)");
  await page.getByRole("button", { name: /^Use imported list/ }).click();
  await page.getByRole("button", { name: "Export list", exact: true }).click();
  await page.getByLabel("Export format").selectOption("csv");
  await expect(
    page.getByRole("status").filter({ hasText: "apostrophe" })
  ).toContainText("apostrophe");
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  const csv = await csvDownload;
  expect(csv.suggestedFilename()).toBe("Chosen.csv");
  expect(await readFile((await csv.path())!, "utf8")).toBe(
    "title,value\r\nChosen,Alpha\r\nChosen,'=SUM(1)\r\n"
  );
  await page.getByLabel("Export format").selectOption("text");
  await expect(
    page.getByText("Items only; title not included.", { exact: true })
  ).toBeVisible();
  const txtDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download TXT" }).click();
  const txt = await txtDownload;
  expect(txt.suggestedFilename()).toBe("Chosen.txt");
  expect(await readFile((await txt.path())!, "utf8")).toBe("Alpha\n=SUM(1)\n");
});

test("plain text options preserve commas, reparse explicitly and refuse multiline TXT", async ({
  page,
}) => {
  await sourceRoutes(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  await page.getByLabel("Paste list").fill("- Alpha, Beta\n\n2. Gamma");
  await page.getByRole("button", { name: "Preview list", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Item 1 / })).toHaveValue(
    "- Alpha, Beta"
  );
  await expect(
    page.getByRole("status").filter({ hasText: "blank line" })
  ).toContainText("1 blank line");
  await page.getByLabel("Remove list markers").check();
  await expect(
    page.getByRole("button", { name: /^Use imported list/ })
  ).toBeDisabled();
  await page.getByRole("button", { name: "Parse list again" }).click();
  await expect(page.getByRole("textbox", { name: /^Item 1 / })).toHaveValue(
    "Alpha, Beta"
  );
  await page.getByRole("textbox", { name: /^Item 2 / }).fill("Gamma\nDelta");
  await page.getByRole("button", { name: /^Use imported list/ }).click();
  await page.getByRole("button", { name: "Export list", exact: true }).click();
  await page.getByLabel("Export format").selectOption("text");
  await expect(page.getByRole("alert")).toContainText("Choose JSON or CSV");
  await expect(
    page.getByRole("button", { name: "Download TXT" })
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Copy to clipboard" })
  ).toBeDisabled();
  await page.getByLabel("Export format").selectOption("csv");
  await expect(
    page.getByRole("button", { name: "Download CSV" })
  ).toBeEnabled();
});

test("CSV header and mapping options stay usable on mobile in both themes", async ({
  page,
}) => {
  await sourceRoutes(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  await page.getByLabel("List file").setInputFiles({
    name: "Songs.csv",
    mimeType: "",
    buffer: Buffer.from("Zulu,first\nAlpha,second"),
  });
  await page.getByLabel("First nonempty record is a header").uncheck();
  await page.getByRole("button", { name: "Preview list", exact: true }).click();
  await page.getByLabel("Item column", { exact: true }).selectOption("0");
  await page.getByRole("button", { name: "Preview list", exact: true }).click();
  await expect(page.getByLabel("Preview title")).toHaveValue("Songs");
  await expect(page.getByRole("textbox", { name: /^Item 1 / })).toHaveValue(
    "Zulu"
  );
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (theme) => document.documentElement.setAttribute("data-theme", theme),
      theme
    );
    expect(
      await page
        .getByRole("dialog")
        .evaluate((dialog) => dialog.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await expect(page.getByLabel("Item column", { exact: true })).toBeVisible();
  }
});

test("changing parser options invalidates a pending file read", async ({
  page,
}) => {
  await sourceRoutes(page);
  await page.goto("/");
  await page.evaluate(() => {
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = async function () {
      const contents = await original.call(this);
      await new Promise<void>((resolve) => {
        Object.assign(window, { releaseAdapterRead: resolve });
      });
      return contents;
    };
  });
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  await page.getByLabel("List file").setInputFiles({
    name: "Songs.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("value\nOld"),
  });
  await page.getByRole("button", { name: "Preview list", exact: true }).click();
  await page.waitForFunction(() => "releaseAdapterRead" in window);
  await page.getByLabel("Import format").selectOption("text");
  await expect(
    page.getByRole("button", { name: "Preview list", exact: true })
  ).toBeEnabled();
  await page.evaluate(() =>
    (
      window as unknown as { releaseAdapterRead: () => void }
    ).releaseAdapterRead()
  );
  await expect(page.getByLabel("Preview title")).toHaveCount(0);
  await page.getByLabel("Paste list").fill("- New");
  await page.getByLabel("Remove list markers").check();
  await page.getByRole("button", { name: "Preview list", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Item 1 / })).toHaveValue(
    "New"
  );
  await expect(page.getByLabel("Preview title")).toHaveValue("misorter");
  await expect(
    page.getByRole("button", { name: /^Use imported list/ })
  ).toBeEnabled();
});

test("visible file picker opens and previews a selected JSON file", async ({
  page,
}) => {
  await sourceRoutes(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  const picker = page.getByRole("button", { name: "Choose file" });
  await expect(picker).toBeVisible();
  await picker.focus();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "my-list.json",
    mimeType: "application/json",
    buffer: Buffer.from(native("Selected file", ["First", "Second"])),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "my-list.json" })
  ).toHaveText("my-list.json");
  await page.getByRole("button", { name: "Preview list", exact: true }).click();
  await expect(page.getByLabel("Preview title")).toHaveValue("Selected file");
  await expect(
    page.getByRole("button", { name: /^Use imported list/ })
  ).toBeEnabled();
});

test("anonymous offline import, repair, keyboard focus and latest typed/pasted download", async ({
  page,
  context,
}) => {
  await sourceRoutes(page);
  await page.goto("/");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await expect(
    page.getByRole("button", { name: "Import list", exact: true })
  ).toBeVisible();
  const requests: string[] = [];
  page.on("request", (request) => {
    if (/listing\.(create|get|createVisit)(?=,|\?)/.test(request.url()))
      requests.push(request.url());
  });
  await context.setOffline(true);
  await page.getByRole("button", { name: "Export list", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Include at least one item"
  );
  await expect(
    page.getByRole("button", { name: "Download JSON" })
  ).toBeDisabled();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await preview(page, " ../Local ", ["Zulu", "", "Zulu"]);
  await expect(
    page.getByRole("button", { name: /^Use imported list/ })
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("nonblank");
  await page
    .getByRole("textbox", { name: /^Item 2 / })
    .fill("line one\nline two");
  await page.getByRole("button", { name: /^Use imported list/ }).click();
  await expect(
    page.getByLabel("Add an item to the list", { exact: true })
  ).toBeFocused();
  await page.evaluate(() => navigator.clipboard.writeText("pasted\nvalue"));
  await page.getByLabel("Edit item 1", { exact: true }).focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("ControlOrMeta+V");
  await page.getByLabel("Edit item 1", { exact: true }).press("End");
  await page.getByLabel("Edit item 1", { exact: true }).pressSequentially("!");
  const output = await exportList(page);
  expect(output.document).toEqual({
    format: "misorter-list",
    version: 1,
    title: " ../Local ",
    items: [
      { value: "pasted\nvalue!" },
      { value: "line one\nline two" },
      { value: "Zulu" },
    ],
  });
  expect(output.name).toBe("-Local.misorter.json");
  expect(output.text.endsWith("\n")).toBe(true);
  expect(requests).toEqual([]);
});

test("loaded route cancels safely, rejects malformed input and detaches same-length replacement", async ({
  page,
}) => {
  await sourceRoutes(page);
  await page.goto("/?list=source&code=keep");
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Zulu"
  );
  const sourceEditor = await page
    .getByLabel("Edit item 1", { exact: true })
    .elementHandle();
  await page
    .getByLabel("Add an item to the list", { exact: true })
    .fill("Pending input");
  const historyLength = await page.evaluate(() => history.length);
  await preview(page, "Replacement", ["Beta", "Gamma"]);
  await page.getByLabel("Paste list").fill("{");
  await page.getByRole("button", { name: "Parse list again" }).click();
  await expect(page.getByRole("alert")).toContainText("Invalid JSON");
  await expect(page.getByLabel("Preview title")).toHaveValue("Replacement");
  await expect(
    page.getByRole("button", { name: /^Use imported list/ })
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/list=source/);
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Zulu"
  );
  await expect(
    page.getByRole("button", { name: "Import list", exact: true })
  ).toBeFocused();
  await preview(page, "Replacement", ["Beta", "Gamma"]);
  await page.getByRole("button", { name: /^Use imported list/ }).click();
  await expect(page).toHaveURL(/\?code=keep$/);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await expect(
    page.getByLabel("Add an item to the list", { exact: true })
  ).toHaveValue("");
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Beta"
  );
  // A same-count replacement must replace the keyed row identity, not reuse it.
  expect(await sourceEditor?.evaluate((element) => element.isConnected)).toBe(
    false
  );
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") mutations.push(request.url());
  });
  await page.getByText("Replacement", { exact: true }).click();
  await page.getByLabel("Edit list title").fill("Canceled title");
  await page.getByRole("button", { name: "Cancel edit" }).click();
  await page.getByText("Replacement", { exact: true }).click();
  await page.getByLabel("Edit list title").fill("Local title");
  await page.getByRole("button", { name: "Save title" }).click();
  expect((await exportList(page)).document.title).toBe("Local title");
  expect(mutations).toEqual([]);
  const creation = page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().includes("listing.create")
  );
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const payload = (await creation).postDataJSON() as Record<
    string,
    { json: unknown }
  >;
  expect(payload["0"].json).toEqual({
    title: "Local title",
    items: [{ value: "Beta" }, { value: "Gamma" }],
  });
});

test("append preserves current title/order and duplicates while detaching the source", async ({
  page,
}) => {
  await sourceRoutes(page);
  await page.goto("/?list=source");
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Zulu"
  );
  const sourceEditor = await page
    .getByLabel("Edit item 1", { exact: true })
    .elementHandle();
  await preview(page, "", ["Zulu", "Delta"]);
  await page.getByLabel("Apply as").selectOption("append");
  await page
    .getByRole("button", { name: "Use imported list · Append · 4 items" })
    .click();
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
  // Existing rows keep their identity while imported duplicate rows are added.
  expect(await sourceEditor?.evaluate((element) => element.isConnected)).toBe(
    true
  );
  expect((await exportList(page)).document).toEqual({
    format: "misorter-list",
    version: 1,
    title: "Original",
    items: [
      { value: "Zulu" },
      { value: "Alpha" },
      { value: "Zulu" },
      { value: "Delta" },
    ],
  });
});

test("a deferred file read cannot overwrite a newer source or a reopened dialog", async ({
  page,
}) => {
  await sourceRoutes(page);
  await page.goto("/");
  await page.evaluate(() => {
    const original = File.prototype.arrayBuffer;
    const releases: (() => Promise<void>)[] = [];
    Object.assign(window, {
      releaseReads: async () => {
        await Promise.all(releases.splice(0).map((release) => release()));
        await new Promise(requestAnimationFrame);
      },
    });
    File.prototype.arrayBuffer = function () {
      return new Promise((resolve) =>
        releases.push(async () => {
          resolve(await original.call(this));
        })
      );
    };
  });
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  await page.getByLabel("List file").setInputFiles({
    name: "old.json",
    mimeType: "application/json",
    buffer: Buffer.from(native("Old", ["Old item"])),
  });
  await page.getByRole("button", { name: "Preview list" }).click();
  await expect(
    page.getByRole("button", { name: "Reading list…" })
  ).toBeVisible();
  await page.getByLabel("Paste list").fill(native("New", ["New item"]));
  await page.getByRole("button", { name: "Preview list" }).click();
  await page.evaluate(() =>
    (window as unknown as { releaseReads: () => Promise<void> }).releaseReads()
  );
  await expect(page.getByLabel("Preview title")).toHaveValue("New");
  await page.getByLabel("List file").setInputFiles({
    name: "old.json",
    mimeType: "application/json",
    buffer: Buffer.from(native("Old", ["Old item"])),
  });
  await page.getByRole("button", { name: "Parse list again" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await preview(page, "Reopened", ["Kept"]);
  await page.evaluate(() =>
    (window as unknown as { releaseReads: () => Promise<void> }).releaseReads()
  );
  await expect(page.getByLabel("Preview title")).toHaveValue("Reopened");
});

test("exports during and after sorting retain input order rather than ranking", async ({
  page,
}) => {
  await sourceRoutes(page);
  await page.route("https://id.twitch.tv/**", (route) =>
    route.fulfill({ status: 401, json: { status: 401 } })
  );
  await page.goto("/?list=source");
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Zulu"
  );
  await page.getByRole("button", { name: "Start", exact: true }).click();
  expect((await exportList(page, true)).document.items).toEqual([
    { value: "Zulu" },
    { value: "Alpha" },
  ]);
  await page.getByText("Alpha", { exact: true }).click();
  await page.getByRole("button", { name: "Show results", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Alpha", exact: true })
  ).toBeVisible();
  const rows = page.getByRole("row");
  await expect(rows.nth(1)).toContainText("Alpha");
  expect((await exportList(page, true)).document.items).toEqual([
    { value: "Zulu" },
    { value: "Alpha" },
  ]);
});

test("large mobile previews are paginated and remain usable in both themes", async ({
  page,
}) => {
  await sourceRoutes(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await preview(
    page,
    "Large",
    Array.from({ length: 1000 }, (_, index) => `Item ${index}`)
  );
  await expect(page.getByText("Page 1 of 20", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Item / })).toHaveCount(50);
  await page.getByRole("button", { name: "Next items" }).click();
  await expect(page.getByRole("textbox", { name: /^Item 51 / })).toHaveValue(
    "Item 50"
  );
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (theme) => document.documentElement.setAttribute("data-theme", theme),
      theme
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: /^Use imported list/ })
    ).toBeEnabled();
  }
});

test("file import checks size before reading and preserves source row references after removal", async ({
  page,
}) => {
  await sourceRoutes(page);
  await page.goto("/");
  await page.evaluate(() => {
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function () {
      if (this.size > 1_048_576) throw new Error("Oversized file was read");
      return original.call(this);
    };
  });
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  const sampleDownload = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Download native JSON example" })
    .click();
  expect((await sampleDownload).suggestedFilename()).toBe(
    "twice-this-is-for.misorter.json"
  );
  await page.getByLabel("List file").setInputFiles({
    name: "large.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(1_048_577, " "),
  });
  await page.getByRole("button", { name: "Preview list" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Choose a file at most 1 MiB"
  );
  await page.getByLabel("List file").setInputFiles({
    name: "valid.json",
    mimeType: "",
    buffer: Buffer.from(
      native("From file", ["Remove", "Kept\nmultiline", "Kept\nmultiline"])
    ),
  });
  await page.getByRole("button", { name: "Preview list" }).click();
  await page
    .getByRole("button", { name: "Remove item 1", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Item 1 (source items[1])", exact: true })
  ).toHaveValue("Kept\nmultiline");
  await expect(
    page.getByText("2 items · 1 duplicate item(s) preserved", { exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: /^Use imported list/ }).click();
  expect((await exportList(page)).document.items).toEqual([
    { value: "Kept\nmultiline" },
    { value: "Kept\nmultiline" },
  ]);
});

test("source-only validation errors remain visible and block application", async ({
  page,
}) => {
  await sourceRoutes(page);
  await page.goto("/");
  await preview(
    page,
    "Too many",
    Array.from({ length: 1001 }, () => "Item")
  );
  await expect(page.getByRole("alert")).toContainText("at most 1,000 items");
  await expect(
    page.getByRole("button", { name: /^Use imported list/ })
  ).toBeDisabled();
  const unknownField =
    '{"format":"misorter-list","version":1,"title":"List","items":[{"value":"Kept"}],"label":"source"}';
  await page.getByLabel("Paste list").fill(unknownField);
  await page.getByRole("button", { name: "Preview list", exact: true }).click();
  await page.getByLabel("Preview title").fill("Edited");
  await expect(page.getByRole("alert")).toContainText("label");
  await expect(
    page.getByRole("button", { name: /^Use imported list/ })
  ).toBeDisabled();
  await expect(page.getByLabel("Paste list")).toHaveValue(unknownField);
});

test("import stays disabled during title/list saves and keyboard focus remains inside the dialog", async ({
  page,
}) => {
  await sourceRoutes(page);
  let release: () => void = () => {
    throw new Error("Save did not begin");
  };
  await page.route("**/trpc/listing.updateTitle**", async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({
      json: [{ result: { data: { json: { success: true } } } }],
    });
  });
  await page.goto("/?list=source");
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Zulu"
  );
  await page
    .getByRole("button", { name: "Edit list title: Original", exact: true })
    .click();
  await page
    .getByLabel("Edit list title", { exact: true })
    .fill("Saving title");
  const saving = page.waitForRequest((request) =>
    request.url().includes("listing.updateTitle")
  );
  await page.getByRole("button", { name: "Save title" }).click();
  await saving;
  await expect(
    page.getByRole("button", { name: "Import list", exact: true })
  ).toBeDisabled();
  release();
  await expect(
    page.getByRole("button", { name: "Import list", exact: true })
  ).toBeEnabled();
  await page.getByRole("button", { name: "Import list", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Import list" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).focus();
  await page.keyboard.press("Tab");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((dialog) => dialog.contains(document.activeElement))
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Import list", exact: true })
  ).toBeFocused();
  await page.route("**/trpc/listing.create?**", async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({
      json: [
        {
          result: {
            data: {
              json: {
                label: "fresh",
                title: "Saving title",
                items: [{ value: "Changed" }, { value: "Alpha" }],
              },
            },
          },
        },
      ],
    });
  });
  await page.getByLabel("Edit item 1", { exact: true }).fill("Changed");
  const creating = page.waitForRequest((request) =>
    request.url().includes("listing.create?")
  );
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await creating;
  await expect(
    page.getByRole("button", { name: "Import list", exact: true })
  ).toBeDisabled();
  release();
});

test("failed download is retryable, releases object URLs and leaves the draft intact", async ({
  page,
}) => {
  await sourceRoutes(page);
  await page.goto("/");
  await preview(page, "Download", ["Kept"]);
  await page.getByRole("button", { name: /^Use imported list/ }).click();
  await page.clock.install();
  await page.evaluate(() => {
    const originalClick = HTMLAnchorElement.prototype.click;
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const urls = { created: [] as string[], revoked: [] as string[] };
    Object.assign(window, { downloadUrls: urls });
    URL.createObjectURL = function (blob) {
      const url = originalCreate(blob);
      urls.created.push(url);
      return url;
    };
    URL.revokeObjectURL = function (url) {
      urls.revoked.push(url);
      originalRevoke(url);
    };
    HTMLAnchorElement.prototype.click = function () {
      HTMLAnchorElement.prototype.click = originalClick;
      throw new Error("Controlled download failure");
    };
  });
  await page.getByRole("button", { name: "Export list", exact: true }).click();
  await page.getByRole("button", { name: "Download JSON" }).click();
  await expect(page.getByRole("alert")).toContainText("Try downloading again");
  const retry = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON" }).click();
  const download = await retry;
  expect(await readFile((await download.path())!, "utf8")).toContain(
    '"value": "Kept"'
  );
  await page.clock.fastForward(1001);
  const urls = await page.evaluate(
    () =>
      (
        window as unknown as {
          downloadUrls: { created: string[]; revoked: string[] };
        }
      ).downloadUrls
  );
  expect(urls.created.length).toBe(2);
  expect(urls.revoked).toEqual(urls.created);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByLabel("Edit item 1", { exact: true })).toHaveValue(
    "Kept"
  );
});

test("a late source response after navigation cannot overwrite an accepted local draft", async ({
  page,
}) => {
  await sourceRoutes(page);
  let release: () => void = () => {
    throw new Error("Source request did not start");
  };
  let started: () => void = () => {};
  const requestStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  let finished: () => void = () => {};
  const requestFinished = new Promise<void>((resolve) => {
    finished = resolve;
  });
  await page.route("**/trpc/**", async (route) => {
    if (!route.request().url().includes("listing.get")) return route.fallback();
    await new Promise<void>((resolve) => {
      release = resolve;
      started();
    });
    await route.fulfill({
      json: [
        {
          result: {
            data: {
              json: {
                label: "late",
                title: "Late source",
                items: [{ value: "Wrong" }],
              },
            },
          },
        },
      ],
    });
    finished();
  });
  await page.goto("/");
  // A client-side history navigation keeps the pending query in the same app.
  await expect(
    page.getByRole("button", { name: "Import list", exact: true })
  ).toBeVisible();
  await page.evaluate(() => {
    history.pushState(null, "", "/?list=late");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await requestStarted;
  await expect(
    page.getByRole("button", { name: "Import list", exact: true })
  ).toHaveCount(0);
  await page.goBack();
  await preview(page, "Accepted", ["Local"]);
  await page.getByRole("button", { name: /^Use imported list/ }).click();
  release();
  await requestFinished;
  expect((await exportList(page)).document).toEqual({
    format: "misorter-list",
    version: 1,
    title: "Accepted",
    items: [{ value: "Local" }],
  });
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
});
