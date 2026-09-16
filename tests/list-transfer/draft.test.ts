import { expect, test } from "bun:test";
import { combineDrafts, importedItems } from "@/utils/list-transfer/draft";

test("replacement creates fresh row identities; append retains existing identities and separates duplicates", () => {
  const current = [
    { id: "source-a", value: "A" },
    { id: "source-b", value: "B" },
  ];
  const imported = { title: "New", items: [{ value: "A" }, { value: "A" }] };
  const replacement = importedItems(current, imported, "replace");
  const appended = importedItems(current, imported, "append");
  expect(replacement.map((row) => row.value)).toEqual(["A", "A"]);
  expect(appended.slice(0, 2)).toEqual(current);
  expect(appended.map((row) => row.value)).toEqual(["A", "B", "A", "A"]);
  const generated = [...replacement, ...appended.slice(2)].map((row) => row.id);
  expect(new Set(generated).size).toBe(4);
  expect(generated.every((id) => id !== "source-a" && id !== "source-b")).toBe(
    true
  );
  expect(current).toEqual([
    { id: "source-a", value: "A" },
    { id: "source-b", value: "B" },
  ]);
});
import { validateDraft } from "@/utils/list-transfer/schema";
import { nativeFilename } from "@/utils/list-transfer/download";

test("replace and append preserve exact values, duplicates and the correct title", () => {
  const current = { title: " Existing ", items: [{ value: "Zulu" }] };
  const imported = {
    title: " Imported ",
    items: [{ value: " A\nB " }, { value: "Zulu" }],
  };
  expect(combineDrafts(current, imported, "replace")).toEqual({
    success: true,
    issues: [],
    draft: {
      title: " Imported ",
      items: [{ value: " A\nB " }, { value: "Zulu" }],
    },
  });
  expect(combineDrafts(current, imported, "append")).toEqual({
    success: true,
    issues: [],
    draft: {
      title: " Existing ",
      items: [{ value: "Zulu" }, { value: " A\nB " }, { value: "Zulu" }],
    },
  });
});

test.each([
  { name: "combined item count", count: 501, value: "A", code: "max_length" },
  {
    name: "combined UTF-8 canonical size",
    count: 100,
    value: "😀".repeat(1500),
    code: "canonical_size",
  },
])(
  "append rejects $name even though each draft is valid",
  ({ count, value, code }) => {
    const current = {
      title: "Current",
      items: Array.from({ length: count }, () => ({ value })),
    };
    const imported = {
      title: "Imported",
      items: Array.from({ length: count - 1 }, () => ({ value })),
    };
    expect(validateDraft(current).success).toBe(true);
    expect(validateDraft(imported).success).toBe(true);
    const result = combineDrafts(current, imported, "append");
    expect(result.success).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(code);
  }
);

test("append validates its retained title rather than the imported title", () => {
  const result = combineDrafts(
    { title: " ", items: [{ value: "A" }] },
    { title: "Valid", items: [{ value: "B" }] },
    "append"
  );
  expect(result.success).toBe(false);
  expect(result.issues).toContainEqual({
    severity: "error",
    code: "blank",
    message: "Enter a nonblank value.",
    path: ["title"],
  });
});

test("filenames strip path/control characters, bound the stem, and have a fallback", () => {
  expect(nativeFilename(" ../a\\b\u0000:c? ")).toBe("-a-b--c-.misorter.json");
  expect(nativeFilename(" ... ")).toBe("misorter-list.misorter.json");
  const unicodeFilename = nativeFilename("😀".repeat(100));
  expect(
    new TextEncoder().encode(unicodeFilename).byteLength
  ).toBeLessThanOrEqual(255);
  expect(unicodeFilename).toMatch(/^(?:😀)+\.misorter\.json$/u);
});
