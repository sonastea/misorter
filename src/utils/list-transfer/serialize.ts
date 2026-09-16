import {
  encodeNativeJson,
  type ImportIssue,
  validateDraft,
  LIST_TRANSFER_LIMITS,
  utf8ByteLength,
} from "@/utils/list-transfer/schema";
import type { TransferFormat } from "@/utils/list-transfer/adapters";

export type SerializeResult =
  | { success: true; text: string; mediaType: string; notices?: string[] }
  | { success: false; issues: ImportIssue[] };

export function serializeNativeJson(input: unknown): SerializeResult {
  const result = validateDraft(input);
  if (!result.success) return { success: false, issues: result.issues };
  return {
    success: true,
    text: encodeNativeJson(result.draft),
    mediaType: "application/json;charset=utf-8",
  };
}

export function serializeList(
  input: unknown,
  format: TransferFormat
): SerializeResult {
  if (format === "json") return serializeNativeJson(input);
  const result = validateDraft(input);
  if (!result.success) return { success: false, issues: result.issues };
  const { title, items } = result.draft;
  if (format === "text" && items.some(({ value }) => /[\r\n]/.test(value))) {
    return {
      success: false,
      issues: [
        {
          severity: "error",
          code: "txt_multiline",
          message:
            "TXT cannot preserve items with embedded line breaks. Choose JSON or CSV.",
        },
      ],
    };
  }
  let escaped = false;
  const cell = (value: string) => {
    if (/^[\t\r\n]|^\s*[=+@-]/u.test(value)) {
      value = `'${value}`;
      escaped = true;
    }
    return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };
  const text =
    format === "text"
      ? `${items.map(({ value }) => value).join("\n")}\n`
      : `title,value\r\n${items.map(({ value }) => `${cell(title)},${cell(value)}\r\n`).join("")}`;
  if (utf8ByteLength(text) > LIST_TRANSFER_LIMITS.maxBytes) {
    return {
      success: false,
      issues: [
        {
          severity: "error",
          code: "download_size",
          message:
            "This download exceeds 1 MiB after formatting. Choose JSON for a smaller, exact backup.",
        },
      ],
    };
  }
  return {
    success: true,
    text,
    mediaType:
      format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8",
    notices: escaped
      ? [
          "Spreadsheet-safe CSV adds an apostrophe to cells that could be read as formulas. These apostrophes remain on reimport. Choose JSON to preserve exact text.",
        ]
      : [],
  };
}
