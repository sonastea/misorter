import { parse as parseCsvRecords, CsvError } from "csv-parse/browser/esm/sync";
import { parseNativeJson } from "@/utils/list-transfer/parse";
import {
  type DraftResult,
  type ImportIssue,
  LIST_TRANSFER_LIMITS,
  utf8ByteLength,
  validateDraft,
} from "@/utils/list-transfer/schema";

export type TransferFormat = "json" | "csv" | "text";
export type ImportFormat = "auto" | TransferFormat;
export type AdapterOptions = {
  format?: ImportFormat;
  filename?: string;
  header?: boolean;
  itemColumn?: number;
  titleColumn?: number | null;
  removeMarkers?: boolean;
};
export type AdapterResult = DraftResult & {
  format: TransferFormat;
  records?: number[];
  columns?: string[];
  itemColumn?: number;
  titleColumn?: number;
  titles?: string[];
};

export function detectFormat(
  text: string,
  options: AdapterOptions
): TransferFormat {
  if (options.format && options.format !== "auto") return options.format;
  const extension = options.filename?.split(".").pop()?.toLowerCase();
  if (extension === "json" || extension === "csv") return extension;
  if (extension === "txt") return "text";
  return /^[\s\uFEFF]*[[{]/u.test(text) ? "json" : "text";
}

const error = (
  code: string,
  message: string,
  sourceRecord?: number
): ImportIssue => ({
  severity: "error",
  code,
  message,
  ...(sourceRecord === undefined ? {} : { sourceRecord }),
});

export function parseList(
  source: string | Uint8Array,
  options: AdapterOptions = {}
): AdapterResult {
  let format = detectFormat("", options);
  const fail = (issue: ImportIssue): AdapterResult => ({
    success: false,
    format,
    issues: [issue],
  });
  if (
    (typeof source === "string" ? utf8ByteLength(source) : source.byteLength) >
    LIST_TRANSFER_LIMITS.maxBytes
  )
    return fail(
      error("input_size", "Import at most 1 MiB (1,048,576 UTF-8 bytes).")
    );
  let text: string;
  try {
    text =
      typeof source === "string"
        ? source
        : new TextDecoder("utf-8", { fatal: true }).decode(source);
  } catch {
    return fail(
      error("invalid_utf8", "Save the file as UTF-8 text and try again.")
    );
  }
  text = text.replace(/^\uFEFF/, "");
  format = detectFormat(text, options);
  // These controls indicate binary content; tab and line endings remain valid text.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(text))
    return fail(
      error(
        text.includes("\0") ? "nul" : "binary",
        "Choose a UTF-8 text file without NUL or binary control characters."
      )
    );
  if (format === "json") {
    const result = parseNativeJson(text);
    return {
      ...result,
      format,
      records: result.draft?.items.map((_, index) => index),
    };
  }
  const title = options.filename
    ? options.filename.replace(/\.[^.]*$/, "")
    : "misorter";
  const records: number[] = [];
  const notices: ImportIssue[] = [];
  if (format === "text") {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    // A final line terminator does not create another source line.
    if (lines.at(-1) === "") lines.pop();
    let blank = 0;
    const items: { value: string }[] = [];
    for (const [index, line] of lines.entries()) {
      if (!line.trim()) {
        blank++;
        continue;
      }
      if (items.length === LIST_TRANSFER_LIMITS.maxItems)
        return fail(error("max_length", "Include at most 1,000 items."));
      const value = options.removeMarkers
        ? line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/u, "")
        : line;
      items.push({ value });
      records.push(index + 1);
    }
    if (blank)
      notices.push({
        severity: "info",
        code: "blank_lines",
        message: `${blank} blank line(s) omitted.`,
      });
    const result = validateDraft({ title, items });
    return {
      ...result,
      format,
      records,
      issues: [
        ...notices,
        ...result.issues.map((issue) => ({
          ...issue,
          ...(typeof issue.path?.[1] === "number"
            ? { sourceLine: records[issue.path[1]] }
            : {}),
        })),
      ],
    };
  }

  const rows: string[][] = [];
  let record = 0;
  let blank = 0;
  let overflow = false;
  const header = options.header ?? true;
  try {
    parseCsvRecords(text, {
      bom: true,
      relax_column_count: true,
      on_record: (row: string[]) => {
        record++;
        if (row.every((cell) => cell === "")) {
          blank++;
          return null;
        }
        if (rows.length >= LIST_TRANSFER_LIMITS.maxItems + (header ? 1 : 0)) {
          overflow = true;
          throw new Error("Item limit exceeded");
        }
        rows.push(row);
        records.push(record);
        return null;
      },
    });
  } catch (cause) {
    if (overflow)
      return fail(error("max_length", "Include at most 1,000 items."));
    if (cause instanceof CsvError)
      return fail(
        error(
          "csv_syntax",
          `Malformed CSV near record ${record + 1}. Check quotes and separators.`,
          record + 1
        )
      );
    throw cause;
  }
  if (blank)
    notices.push({
      severity: "info",
      code: "empty_records",
      message: `${blank} empty record(s) omitted.`,
    });
  const first = rows[0] || [];
  const columns = first.map((cell, index) =>
    header
      ? `${index + 1}: ${cell || "Unnamed column"}`
      : `Column ${index + 1} (${cell})`
  );
  const matches = first.flatMap((cell, index) =>
    /^(value|item|name)$/i.test(cell) ? [index] : []
  );
  const titleMatches = first.flatMap((cell, index) =>
    cell === "title" ? [index] : []
  );
  const itemColumn =
    options.itemColumn ??
    (first.length === 1
      ? 0
      : header && matches.length === 1
        ? matches[0]
        : undefined);
  const titleColumn =
    options.titleColumn === null
      ? undefined
      : (options.titleColumn ??
        (header && titleMatches.length === 1 ? titleMatches[0] : undefined));
  const metadata = { format, columns, itemColumn, titleColumn };
  for (let index = 1; index < rows.length; index++) {
    if (rows[index].length !== first.length)
      return {
        success: false,
        ...metadata,
        issues: [
          error(
            "csv_width",
            `Record ${records[index]} has ${rows[index].length} cells; expected ${first.length}. Correct the source CSV.`,
            records[index]
          ),
        ],
      };
  }
  if (
    itemColumn === undefined ||
    !Number.isInteger(itemColumn) ||
    itemColumn < 0 ||
    itemColumn >= first.length
  )
    return {
      success: false,
      ...metadata,
      issues: [
        ...notices,
        error("csv_mapping", "Choose the column containing your items."),
      ],
    };
  if (
    titleColumn !== undefined &&
    (!Number.isInteger(titleColumn) ||
      titleColumn < 0 ||
      titleColumn >= first.length)
  )
    return {
      success: false,
      ...metadata,
      issues: [
        error(
          "csv_mapping",
          "Choose a valid title column or use the fallback title."
        ),
      ],
    };
  const data = header ? rows.slice(1) : rows;
  const sourceRecords = header ? records.slice(1) : records;
  const titles =
    titleColumn === undefined
      ? []
      : [
          ...new Set(
            data.map((row) => row[titleColumn]).filter((cell) => cell.trim())
          ),
        ];
  if (titles.length > 1)
    notices.push(
      error(
        "csv_titles",
        "This CSV contains different titles. Enter or choose a preview title before replacing the list."
      )
    );
  const unused = columns.filter(
    (_, index) => index !== itemColumn && index !== titleColumn
  );
  if (unused.length)
    notices.push({
      severity: "info",
      code: "unused_columns",
      message: `Unused columns: ${unused.join(", ")}.`,
    });
  const result = validateDraft({
    title: titles.length === 1 ? titles[0] : title,
    items: data.map((row) => ({ value: row[itemColumn] })),
  });
  const details = {
    ...metadata,
    records: sourceRecords,
    titles,
    issues: [
      ...notices,
      ...result.issues.map((issue) => ({
        ...issue,
        ...(typeof issue.path?.[1] === "number"
          ? { sourceRecord: sourceRecords[issue.path[1]] }
          : {}),
      })),
    ],
  };
  return result.success && titles.length <= 1
    ? { ...details, success: true, draft: result.draft }
    : { ...details, success: false, draft: result.draft };
}
