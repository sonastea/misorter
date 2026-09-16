import * as v from "valibot";
import {
  type DraftResult,
  editableCandidate,
  LIST_TRANSFER_LIMITS,
  NativeListSchema,
  utf8ByteLength,
  validationIssues,
} from "@/utils/list-transfer/schema";

const failure = (code: string, message: string): DraftResult => ({
  success: false,
  issues: [{ severity: "error", code, message }],
});

/** Native-only parser: failures never fall back to text or another adapter. */
export function parseNativeJson(source: string | Uint8Array): DraftResult {
  const bytes =
    typeof source === "string" ? utf8ByteLength(source) : source.byteLength;
  if (bytes > LIST_TRANSFER_LIMITS.maxBytes) {
    return failure(
      "input_size",
      "Import at most 1 MiB (1,048,576 UTF-8 bytes)."
    );
  }

  let text: string;
  try {
    text =
      typeof source === "string"
        ? source
        : new TextDecoder("utf-8", { fatal: true }).decode(source);
  } catch {
    return failure(
      "invalid_utf8",
      "Save the file as UTF-8 text and try again."
    );
  }
  if (text.includes("\0")) {
    return failure(
      "nul",
      "NUL characters are not supported. Choose a UTF-8 JSON file."
    );
  }

  let input: unknown;
  try {
    input = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    return failure(
      "json_syntax",
      "Invalid JSON. Correct the JSON syntax and try again."
    );
  }
  if (
    typeof input !== "object" ||
    input === null ||
    !("format" in input) ||
    input.format !== "misorter-list"
  ) {
    return failure(
      "native_format",
      'Use a Misorter document, for example: {"format":"misorter-list","version":1,"title":"My list","items":[{"value":"Item"}]}'
    );
  }
  if ("version" in input && input.version !== 1) {
    return failure(
      "unsupported_version",
      "This file uses an unsupported Misorter format version."
    );
  }

  const result = v.safeParse(NativeListSchema, input);
  if (!result.success) {
    return {
      success: false,
      draft: editableCandidate(input),
      issues: validationIssues(result.issues),
    };
  }
  const { title, items } = result.output;
  const duplicates =
    items.length - new Set(items.map(({ value }) => value)).size;
  return {
    success: true,
    draft: { title, items },
    issues: duplicates
      ? [
          {
            severity: "info",
            code: "duplicates",
            message: `${duplicates} duplicate item(s) preserved.`,
          },
        ]
      : [],
  };
}
