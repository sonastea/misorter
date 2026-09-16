import { describe, expect, test } from "bun:test";
import Ajv from "ajv";
import * as v from "valibot";
import publishedSchema from "../../public/schemas/misorter-list-v1.schema.json";
import { parseNativeJson } from "@/utils/list-transfer/parse";
import { serializeNativeJson } from "@/utils/list-transfer/serialize";
import {
  CreateListSchema,
  NativeListSchema,
  validateDraft,
} from "@/utils/list-transfer/schema";

const exactDraft = {
  title: "  Games 🎮 e\u0301  ",
  items: [
    { value: "Zulu" },
    { value: "  Alpha\t" },
    { value: "Zulu" },
    { value: 'Quotes: "hi" \\ path' },
    { value: "first\r\nsecond\nthird" },
    { value: "😀 e\u0301 é <b>literal</b>" },
  ],
};
const document = (title = "List", values = ["Item"]) => ({
  format: "misorter-list",
  version: 1,
  title,
  items: values.map((value) => ({ value })),
});
const fixture = await Bun.file(
  new URL("./fixtures/exact.misorter.json", import.meta.url)
).text();

test("native golden bytes and content are preserved independently in both directions", () => {
  const parsed = parseNativeJson(`\uFEFF \n${fixture}\t`);
  expect(parsed).toEqual({
    success: true,
    draft: exactDraft,
    issues: [
      {
        severity: "info",
        code: "duplicates",
        message: "1 duplicate item(s) preserved.",
      },
    ],
  });
  const exported = serializeNativeJson(exactDraft);
  expect(exported).toEqual({
    success: true,
    text: fixture,
    mediaType: "application/json;charset=utf-8",
  });
  if (!exported.success) throw new Error("Expected export");
  expect(parseNativeJson(new TextEncoder().encode(exported.text))).toEqual(
    parsed
  );
});

const shapeCases: {
  name: string;
  input: unknown;
  path: (string | number)[];
}[] = [
  {
    name: "missing title",
    input: { format: "misorter-list", version: 1, items: [{ value: "A" }] },
    path: ["title"],
  },
  {
    name: "missing version",
    input: { format: "misorter-list", title: "A", items: [{ value: "A" }] },
    path: ["version"],
  },
  {
    name: "wrong title type",
    input: { ...document(), title: 42 },
    path: ["title"],
  },
  {
    name: "wrong items type",
    input: { ...document(), items: "A" },
    path: ["items"],
  },
  {
    name: "wrong item type",
    input: { ...document(), items: ["A"] },
    path: ["items", 0],
  },
  {
    name: "missing value",
    input: { ...document(), items: [{}] },
    path: ["items", 0, "value"],
  },
  {
    name: "wrong value type",
    input: { ...document(), items: [{ value: null }] },
    path: ["items", 0, "value"],
  },
  {
    name: "root identity",
    input: { ...document(), label: "old" },
    path: ["label"],
  },
  {
    name: "item identity",
    input: { ...document(), items: [{ value: "A", id: 9 }] },
    path: ["items", 0, "id"],
  },
];

describe("strict native shape", () => {
  test.each(shapeCases)("$name", ({ input, path }) => {
    const result = parseNativeJson(JSON.stringify(input));
    expect(result.success).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ severity: "error", path })
    );
  });
  test.each([2, 0, "1", null])(
    "unsupported version %j precedes invalid fields",
    (version) => {
      expect(
        parseNativeJson(JSON.stringify({ format: "misorter-list", version }))
      ).toEqual({
        success: false,
        issues: [
          {
            severity: "error",
            code: "unsupported_version",
            message: "This file uses an unsupported Misorter format version.",
          },
        ],
      });
    }
  );
  test.each([
    { input: [] },
    { input: {} },
    { input: { format: "other", version: 1 } },
  ])("unrelated JSON requires native shape: %j", ({ input }) => {
    const result = parseNativeJson(JSON.stringify(input));
    expect(result.success).toBe(false);
    expect(result.issues[0].code).toBe("native_format");
    expect(result.issues[0].message).toContain('"format":"misorter-list"');
  });
});

test("decoding rejects malformed JSON, binary NUL and invalid UTF-8 without replacement", () => {
  for (const [source, code] of [
    ["{", "json_syntax"],
    [new Uint8Array([0xc3, 0x28]), "invalid_utf8"],
    [new Uint8Array([0x00, 0x01]), "nul"],
  ] as const) {
    const result = parseNativeJson(source);
    expect(result).toEqual({
      success: false,
      issues: [expect.objectContaining({ severity: "error", code })],
    });
  }
});

const fieldCases = [
  {
    name: "title at code-point limit",
    input: document("😀".repeat(255)),
    valid: true,
  },
  {
    name: "title above code-point limit",
    input: document("😀".repeat(256)),
    valid: false,
    code: "title_length",
    path: ["title"],
  },
  {
    name: "item at code-point limit",
    input: document("L", ["😀".repeat(2000)]),
    valid: true,
  },
  {
    name: "item above code-point limit",
    input: document("L", ["😀".repeat(2001)]),
    valid: false,
    code: "item_length",
    path: ["items", 0, "value"],
  },
  {
    name: "combining marks count separately",
    input: document("e\u0301".repeat(128)),
    valid: false,
    code: "title_length",
    path: ["title"],
  },
  {
    name: "blank title",
    input: document(" \t\n\uFEFF"),
    valid: false,
    code: "blank",
    path: ["title"],
  },
  {
    name: "blank item",
    input: document("L", ["\r\n "]),
    valid: false,
    code: "blank",
    path: ["items", 0, "value"],
  },
  {
    name: "NUL title",
    input: document("a\0b"),
    valid: false,
    code: "nul",
    path: ["title"],
  },
  {
    name: "NUL item",
    input: document("L", ["a\0b"]),
    valid: false,
    code: "nul",
    path: ["items", 0, "value"],
  },
  { name: "one item", input: document(), valid: true },
  {
    name: "zero items",
    input: document("L", []),
    valid: false,
    code: "min_length",
    path: ["items"],
  },
  {
    name: "1000 items",
    input: document("L", Array<string>(1000).fill("A")),
    valid: true,
  },
  {
    name: "1001 items",
    input: document("L", Array<string>(1001).fill("A")),
    valid: false,
    code: "max_length",
    path: ["items"],
  },
];

test.each(fieldCases)(
  "field constraints: $name",
  ({ input, valid, code, path }) => {
    const result = parseNativeJson(JSON.stringify(input));
    expect(result.success).toBe(valid);
    if (!valid)
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code, path })
      );
  }
);

test("invalid editable fields retain exact candidate; creation alone requires two items", () => {
  const draft = { title: "  ", items: [{ value: "\t" }] };
  expect(validateDraft(draft)).toMatchObject({ success: false, draft });
  expect(
    parseNativeJson(
      JSON.stringify({ format: "misorter-list", version: 1, ...draft })
    )
  ).toMatchObject({ success: false, draft });
  expect(serializeNativeJson(draft)).toMatchObject({
    success: false,
    issues: [
      expect.objectContaining({ path: ["title"] }),
      expect.objectContaining({ path: ["items", 0, "value"] }),
    ],
  });
  expect(
    v.safeParse(CreateListSchema, { title: "L", items: [{ value: "A" }] })
      .success
  ).toBe(false);
  expect(
    v.safeParse(CreateListSchema, {
      title: "L",
      items: [{ value: "A" }, { value: "A" }],
    }).success
  ).toBe(true);
});

// Input builder uses only standard JSON encoding, not production helpers/limits.
function documentAtCanonicalBytes(bytes: number) {
  const input = document("é", Array<string>(1000).fill("x"));
  let remaining =
    bytes -
    new TextEncoder().encode(`${JSON.stringify(input, null, 2)}\n`).length;
  for (const item of input.items) {
    const added = Math.min(1999, remaining);
    item.value += "x".repeat(added);
    remaining -= added;
  }
  if (remaining !== 0) throw new Error("Invalid test fixture size");
  return input;
}

test("raw UTF-8 byte limit includes whitespace and multibyte characters", () => {
  const text = JSON.stringify(document("é"));
  const atLimit =
    text + " ".repeat(1_048_576 - new TextEncoder().encode(text).length);
  expect(parseNativeJson(atLimit)).toMatchObject({
    success: true,
    draft: { title: "é", items: [{ value: "Item" }] },
  });
  for (const source of [
    atLimit + " ",
    new TextEncoder().encode(atLimit + " "),
  ]) {
    expect(parseNativeJson(source)).toMatchObject({
      success: false,
      issues: [{ code: "input_size" }],
    });
  }
});

test("canonical byte overhead is enforced on compact import, edited drafts and export", () => {
  for (const [bytes, valid] of [
    [1_048_576, true],
    [1_048_577, false],
  ] as const) {
    const input = documentAtCanonicalBytes(bytes);
    const draft = { title: input.title, items: input.items };
    expect(
      new TextEncoder().encode(`${JSON.stringify(input, null, 2)}\n`).length
    ).toBe(bytes);
    const parsed = parseNativeJson(JSON.stringify(input));
    const exported = serializeNativeJson(draft);
    expect(parsed.success).toBe(valid);
    expect(exported.success).toBe(valid);
    if (!parsed.success)
      expect(parsed.issues).toContainEqual(
        expect.objectContaining({ code: "canonical_size" })
      );
    if (!exported.success)
      expect(exported.issues).toContainEqual(
        expect.objectContaining({ code: "canonical_size" })
      );
    if (exported.success)
      expect(parseNativeJson(exported.text)).toMatchObject({
        success: true,
        draft,
      });
  }
});

test("published JSON Schema agrees on independent shape and field corpus; sample is valid", async () => {
  const check = new Ajv({ allErrors: true }).compile(publishedSchema);
  const sample: unknown = JSON.parse(
    await Bun.file(
      new URL(
        "../../public/examples/favorite-games.misorter.json",
        import.meta.url
      )
    ).text()
  );
  const cases = [
    ...fieldCases,
    ...shapeCases.map(({ input }) => ({ input, valid: false })),
    { input: sample, valid: true },
    { input: JSON.parse(fixture) as unknown, valid: true },
    { input: { ...document(), version: 2 }, valid: false },
    { input: { ...document(), format: "other" }, valid: false },
  ];
  for (const { input, valid } of cases) {
    expect(check(input)).toBe(valid);
    expect(v.safeParse(NativeListSchema, input).success).toBe(valid);
  }
});
