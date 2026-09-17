/* eslint @typescript-eslint/no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] -- Mock signatures retain storage arguments for call assertions. */
import { beforeEach, expect, mock, spyOn, test } from "bun:test";
import { items, listings } from "../../src/db/schema";
import type { List } from "../../src/backend/router/listing";
import { serializeNativeJson } from "../../src/utils/list-transfer/serialize";

// Mock external storage only. The real tRPC validation and handlers run below.
// In particular, this callback stub makes no claim about PostgreSQL rollback.
let returnedItems: { id: number; value: string }[];
let insertFailure: Error | undefined;
let storedList: List | undefined;
let updatedRows: { label: string }[];
let cacheWrite: Promise<string>;
const background: Promise<unknown>[] = [];
const insertListing = mock((row: { label: string; title: string }) => ({
  returning: async () => [row],
}));
const insertItems = mock(
  (_rows: { listingLabel: string; value: string }[]) => ({
    returning: async () => {
      if (insertFailure) throw insertFailure;
      return returnedItems;
    },
  })
);
const tx = {
  insert: (table: unknown) => {
    if (table === listings) return { values: insertListing };
    if (table === items) return { values: insertItems };
    throw new Error("Unexpected insertion table");
  },
};
const setTitle = mock((_row: { title: string }) => ({
  where: () => ({ returning: async () => updatedRows }),
}));
const findFirst = mock(async () => storedList);
const getDb = mock(() => ({
  transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) =>
    callback(tx),
  update: () => ({ set: setTitle }),
  query: { listings: { findFirst } },
}));
const cacheGet = mock(async (_label: string): Promise<string | null> => null);
const cacheSet = mock(
  (_label: string, _value: string, _options: unknown) => cacheWrite
);
const cacheDelete = mock(async (_label: string) => 1);
mock.module("../../src/db/client", () => ({ getDb }));
mock.module("../../src/utils/redis", () => ({
  getRedis: () => ({ get: cacheGet, set: cacheSet, del: cacheDelete }),
}));
const { listingRouter } = await import("../../src/backend/router/listing");
const caller = listingRouter.createCaller({
  req: new Request("http://localhost/trpc"),
  resHeaders: new Headers(),
  waitUntil: (promise) => {
    background.push(promise);
  },
});

beforeEach(() => {
  for (const boundary of [
    insertListing,
    insertItems,
    setTitle,
    findFirst,
    getDb,
    cacheGet,
    cacheSet,
    cacheDelete,
  ])
    boundary.mockClear();
  returnedItems = [
    { id: 30, value: "Zulu" },
    { id: 10, value: "Zulu" },
    { id: 20, value: " Alpha\n🎵 " },
  ];
  insertFailure = undefined;
  storedList = undefined;
  updatedRows = [{ label: "source" }];
  cacheWrite = Promise.resolve("OK");
  background.length = 0;
});

test("direct creation enforces shared rules before persistence", async () => {
  for (const draft of [
    { title: "One", items: [{ value: "Only" }] },
    { title: "Blank", items: [{ value: "  " }, { value: "Valid" }] },
    {
      title: "Large",
      items: Array.from({ length: 1000 }, () => ({ value: "😀".repeat(1000) })),
    },
  ]) {
    await expect(caller.create(draft)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  }
  expect(getDb).not.toHaveBeenCalled();
});

test("direct title updates enforce the portable title rule", async () => {
  for (const title of [" ", "x".repeat(256), "bad\0title"]) {
    await expect(
      caller.updateTitle({ label: "missing", title })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  }
  expect(getDb).not.toHaveBeenCalled();
});

test("creation preserves insertion values and orders returned rows under a fresh label", async () => {
  const draft = {
    title: "  Music 🎵  ",
    items: [{ value: "Zulu" }, { value: " Alpha\n🎵 " }, { value: "Zulu" }],
  };
  const first = await caller.create(draft);
  expect(first).toEqual({ label: expect.any(String), ...draft });
  expect(first.label).not.toBe("");
  expect(insertListing).toHaveBeenCalledWith({
    label: first.label,
    title: "  Music 🎵  ",
  });
  expect(insertItems).toHaveBeenCalledWith([
    { listingLabel: first.label, value: "Zulu" },
    { listingLabel: first.label, value: " Alpha\n🎵 " },
    { listingLabel: first.label, value: "Zulu" },
  ]);
  const second = await caller.create(draft);
  expect(second.label).not.toBe(first.label);
  expect(cacheSet).not.toHaveBeenCalled();
});

test("rejected or incomplete item insertion never reports successful creation", async () => {
  const draft = { title: "Failure", items: [{ value: "A" }, { value: "B" }] };
  insertFailure = new Error("Controlled storage failure");
  await expect(caller.create(draft)).rejects.toMatchObject({
    code: "INTERNAL_SERVER_ERROR",
    cause: insertFailure,
  });
  insertFailure = undefined;
  returnedItems = [{ id: 1, value: "A" }];
  await expect(caller.create(draft)).rejects.toMatchObject({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to create listing items",
  });
  expect(cacheSet).not.toHaveBeenCalled();
});

test("title update preserves exact text and schedules a nonblocking, failure-contained cache refresh", async () => {
  storedList = {
    label: "source",
    title: "  New 🎵  ",
    items: [{ value: "Z" }, { value: "A" }],
  };
  let rejectCache!: (error: Error) => void;
  cacheWrite = new Promise((_resolve, reject) => {
    rejectCache = reject;
  });
  const log = spyOn(console, "error").mockImplementation(() => {});
  try {
    // This must finish while the cache promise is still pending.
    const result = await caller.updateTitle({
      label: "source",
      title: "  New 🎵  ",
    });
    expect(result).toEqual(storedList);
    expect(setTitle).toHaveBeenCalledWith({ title: "  New 🎵  " });
    expect(cacheSet).toHaveBeenCalledWith(
      "source",
      JSON.stringify(storedList),
      { keepTtl: true }
    );
    expect(background).toHaveLength(1);
    rejectCache(new Error("Controlled cache outage"));
    await expect(Promise.all(background)).resolves.toEqual([undefined]);
    expect(log).toHaveBeenCalled();
  } finally {
    rejectCache(new Error("Test cleanup"));
    await Promise.allSettled([cacheWrite, ...background]);
    log.mockRestore();
  }
});

test.each(["before update", "after update"])(
  "missing list %s deletes its cache rather than publishing an empty list",
  async (when) => {
    updatedRows = when === "before update" ? [] : [{ label: "source" }];
    await expect(
      caller.updateTitle({ label: "source", title: "Valid" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await Promise.all(background);
    expect(cacheDelete).toHaveBeenCalledWith("source");
    expect(cacheSet).not.toHaveBeenCalled();
  }
);

test("legacy values remain readable and export identifies incompatibility without truncating", async () => {
  storedList = {
    label: "legacy",
    title: "Legacy",
    items: [{ value: "x".repeat(2001) }, { value: "Short" }],
  };
  const result = await caller.get({ label: "legacy" });
  expect(result).toEqual(storedList);
  const exported = serializeNativeJson({
    title: result?.title,
    items: result?.items,
  });
  expect(exported.success).toBe(false);
  if (exported.success) throw new Error("Legacy export unexpectedly accepted");
  expect(exported.issues).toContainEqual(
    expect.objectContaining({
      code: "item_length",
      path: ["items", 0, "value"],
    })
  );
  expect(result?.items).toEqual([
    { value: "x".repeat(2001) },
    { value: "Short" },
  ]);
  expect(setTitle).not.toHaveBeenCalled();
  expect(insertListing).not.toHaveBeenCalled();
  await Promise.all(background);
});
