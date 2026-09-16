import {
  encodeNativeJson,
  type ImportIssue,
  validateDraft,
} from "@/utils/list-transfer/schema";

export type SerializeResult =
  | { success: true; text: string; mediaType: "application/json;charset=utf-8" }
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
