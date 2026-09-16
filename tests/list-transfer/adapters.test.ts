import { expect, test } from "bun:test";
import { parseList } from "@/utils/list-transfer/adapters";
import { serializeList } from "@/utils/list-transfer/serialize";

test("CSV preserves quoted cells, duplicates and logical source records", () => {
  const result = parseList(
    '\uFEFFtitle,value,ignored\r\nGames," Zulu, ""hi"" ",x\r\n,,\r\nGames,"first\r\nsecond",y\r\nGames," Zulu, ""hi"" ",z\r\n',
    { format: "csv" }
  );
  expect(result.success).toBe(true);
  expect(result.draft).toEqual({
    title: "Games",
    items: [
      { value: ' Zulu, "hi" ' },
      { value: "first\r\nsecond" },
      { value: ' Zulu, "hi" ' },
    ],
  });
  expect(result.records).toEqual([2, 4, 5]);
  expect(result.issues.map((issue) => issue.code)).toEqual([
    "empty_records",
    "unused_columns",
  ]);
});

test("CSV mapping requires an unambiguous item column and resolves title conflicts explicitly", () => {
  const source = "title,name,item\nOne,A,B\nTwo,C,D";
  const ambiguous = parseList(source, { format: "csv" });
  expect(ambiguous.issues.map((issue) => issue.code)).toContain("csv_mapping");
  expect(ambiguous.draft).toBeUndefined();
  const mapped = parseList(source, { format: "csv", itemColumn: 2 });
  expect(mapped.success).toBe(false);
  expect(mapped.titles).toEqual(["One", "Two"]);
  expect(mapped.draft).toEqual({
    title: "misorter",
    items: [{ value: "B" }, { value: "D" }],
  });
  expect(mapped.issues.map((issue) => issue.code)).toContain("csv_titles");
  expect(parseList("NAME\nAlpha\nAlpha", { format: "csv" }).draft).toEqual({
    title: "misorter",
    items: [{ value: "Alpha" }, { value: "Alpha" }],
  });
  expect(
    parseList("First\nSecond", {
      format: "csv",
      header: false,
      filename: "Songs.csv",
    }).draft
  ).toEqual({
    title: "Songs",
    items: [{ value: "First" }, { value: "Second" }],
  });
  expect(
    parseList("A,B\nC,D", { format: "csv", header: false, itemColumn: 1 }).draft
      ?.items
  ).toEqual([{ value: "B" }, { value: "D" }]);
  expect(
    parseList("title,value\nOne,A\nTwo,B", { format: "csv", titleColumn: null })
      .success
  ).toBe(true);
});

test("CSV malformed records block; blank selected cells remain repairable", () => {
  for (const [source, code, record] of [
    ['value,other\n"unclosed,x', "csv_syntax", 2],
    ["value,other\nA,x,extra", "csv_width", 2],
    ['value\nbad"quote', "csv_syntax", 2],
  ] as const) {
    const result = parseList(source, { format: "csv" });
    expect(result.success).toBe(false);
    expect(result.draft).toBeUndefined();
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code, sourceRecord: record })
    );
  }
  const result = parseList("value,other\n   ,kept\n,x\n,,", { format: "csv" });
  expect(
    result.issues
      .filter((issue) => issue.code === "blank")
      .map((issue) => issue.sourceRecord)
  ).toEqual([2, 3]);
  expect(result.draft?.items).toEqual([{ value: "   " }, { value: "" }]);
});

test("text preserves literal punctuation, skips blank lines and removes only one opted-in marker", () => {
  const source =
    "  - Alpha, beta;\tvalue\r\n\r\n2) Second\r• * Nested\nNo. 4\n-Not a marker\n";
  const literal = parseList(source);
  expect(literal.format).toBe("text");
  expect(literal.draft).toEqual({
    title: "misorter",
    items: [
      { value: "  - Alpha, beta;\tvalue" },
      { value: "2) Second" },
      { value: "• * Nested" },
      { value: "No. 4" },
      { value: "-Not a marker" },
    ],
  });
  expect(literal.records).toEqual([1, 3, 4, 5, 6]);
  expect(literal.issues).toContainEqual(
    expect.objectContaining({
      code: "blank_lines",
      message: "1 blank line(s) omitted.",
    })
  );
  const cleaned = parseList(source, { removeMarkers: true });
  expect(cleaned.draft?.items).toEqual([
    { value: "Alpha, beta;\tvalue" },
    { value: "Second" },
    { value: "* Nested" },
    { value: "No. 4" },
    { value: "-Not a marker" },
  ]);
  expect(
    parseList("1. One\n* Two\n- Three\n", { removeMarkers: true }).draft?.items
  ).toEqual([{ value: "One" }, { value: "Two" }, { value: "Three" }]);
});

test("detection honors extensions and explicit selection without error fallback", () => {
  expect(parseList("value\nA", { filename: "List.CSV" }).format).toBe("csv");
  expect(parseList("[literal]", { filename: "List.txt" }).draft?.items).toEqual(
    [{ value: "[literal]" }]
  );
  expect(parseList("title,value\nList,A").draft?.items).toEqual([
    { value: "title,value" },
    { value: "List,A" },
  ]);
  expect(parseList("title,value\nList,A", { format: "csv" }).draft?.title).toBe(
    "List"
  );
  for (const source of ["{", "[]", '{"format":"misorter-list","version":2}']) {
    const result = parseList(source, { filename: "unknown.data" });
    expect(result.format).toBe("json");
    expect(result.success).toBe(false);
    expect(result.draft).toBeUndefined();
  }
  const invalidTitle = parseList("A", { filename: `${"x".repeat(256)}.txt` });
  expect(invalidTitle.draft?.title).toBe("x".repeat(256));
  expect(invalidTitle.issues.map((issue) => issue.code)).toContain(
    "title_length"
  );
});

test("all adapters reject binary, invalid encoding, oversized sources and excessive items", () => {
  expect(
    parseList(new Uint8Array([0xc3, 0x28]), { format: "csv" }).issues[0].code
  ).toBe("invalid_utf8");
  expect(parseList("A\0B").issues[0].code).toBe("nul");
  expect(parseList("A\u0001B").issues[0].code).toBe("binary");
  expect(parseList("x".repeat(1_048_577)).issues[0].code).toBe("input_size");
  for (const format of ["csv", "text"] as const) {
    expect(
      parseList(Array(1000).fill("A").join("\n"), { format, header: false })
        .success
    ).toBe(true);
    const tooMany = parseList(Array(1001).fill("A").join("\n"), {
      format,
      header: false,
    });
    expect(tooMany.issues[0].code).toBe("max_length");
    expect(tooMany.draft).toBeUndefined();
  }
});

test("CSV golden output quotes standard cells and escapes formula prefixes, never stripping apostrophes", () => {
  const result = serializeList(
    {
      title: "  =Title",
      items: [
        "A,B",
        'Say "hi"',
        "line\nbreak",
        " +SUM(1)",
        "-1",
        "@a",
        "\ttext",
        "\rtext",
        "\ntext",
        "'literal",
        "  ordinary",
      ].map((value) => ({ value })),
    },
    "csv"
  );
  expect(result.success).toBe(true);
  if (!result.success) throw new Error("Expected CSV");
  expect(result.text).toBe(
    "title,value\r\n'  =Title,\"A,B\"\r\n'  =Title,\"Say \"\"hi\"\"\"\r\n'  =Title,\"line\nbreak\"\r\n'  =Title,' +SUM(1)\r\n'  =Title,'-1\r\n'  =Title,'@a\r\n'  =Title,'\ttext\r\n'  =Title,\"'\rtext\"\r\n'  =Title,\"'\ntext\"\r\n'  =Title,'literal\r\n'  =Title,  ordinary\r\n"
  );
  expect(result.notices?.[0]).toContain("apostrophe");
  expect(
    parseList("title,value\n'Original,'literal", { format: "csv" }).draft
  ).toEqual({ title: "'Original", items: [{ value: "'literal" }] });
});

test("TXT omits title but preserves values; multiline and oversized downloads offer alternatives", () => {
  expect(
    serializeList(
      {
        title: "Not exported",
        items: [{ value: " Zulu " }, { value: "A" }, { value: "A" }],
      },
      "text"
    )
  ).toEqual({
    success: true,
    text: " Zulu \nA\nA\n",
    mediaType: "text/plain;charset=utf-8",
    notices: [],
  });
  for (const value of ["a\rb", "a\nb"]) {
    const result = serializeList({ title: "List", items: [{ value }] }, "text");
    expect(result).toEqual({
      success: false,
      issues: [expect.objectContaining({ code: "txt_multiline" })],
    });
  }
  const draft = {
    title: "😀".repeat(255),
    items: Array.from({ length: 1000 }, () => ({ value: "x".repeat(30) })),
  };
  expect(serializeList(draft, "json").success).toBe(true);
  expect(serializeList(draft, "csv")).toEqual({
    success: false,
    issues: [expect.objectContaining({ code: "download_size" })],
  });
});

test("CSV download byte boundary is inclusive after repeated titles and record endings", () => {
  for (const [lastLength, bytes, accepted] of [
    [1352, 1_048_575, true],
    [1353, 1_048_576, true],
    [1354, 1_048_577, false],
  ] as const) {
    const draft = {
      title: "T".repeat(255),
      items: [
        ...Array.from({ length: 999 }, () => ({ value: "x".repeat(790) })),
        { value: "y".repeat(lastLength) },
      ],
    };
    const result = serializeList(draft, "csv");
    expect(result.success).toBe(accepted);
    if (result.success)
      expect(new TextEncoder().encode(result.text).byteLength).toBe(bytes);
    else expect(result.issues[0].code).toBe("download_size");
  }
});
