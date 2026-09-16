import * as v from "valibot";

export const LIST_TRANSFER_LIMITS = {
  maxBytes: 1_048_576,
  maxItems: 1_000,
  maxTitleCodePoints: 255,
  maxItemCodePoints: 2_000,
} as const;

export const ImportIssueSchema = v.object({
  severity: v.picklist(["error", "info"]),
  code: v.string(),
  message: v.string(),
  path: v.optional(v.array(v.union([v.string(), v.number()]))),
  sourceLine: v.optional(v.number()),
  sourceRecord: v.optional(v.number()),
});
export type ImportIssue = v.InferOutput<typeof ImportIssueSchema>;

const messages = {
  blank: "Enter a nonblank value.",
  nul: "NUL characters are not supported.",
  title_length: "Title must contain at most 255 Unicode code points.",
  item_length: "Item must contain at most 2,000 Unicode code points.",
  canonical_size:
    "The native JSON document must be at most 1 MiB (1,048,576 bytes).",
} as const;

const textSchema = (max: number, message: string) =>
  v.pipe(
    v.string(),
    v.check((text) => text.trim().length > 0, messages.blank),
    v.check((text) => !text.includes("\0"), messages.nul),
    v.check((text) => [...text].length <= max, message)
  );

export const ListTitleSchema = textSchema(
  LIST_TRANSFER_LIMITS.maxTitleCodePoints,
  messages.title_length
);
export const ListItemSchema = v.strictObject({
  value: textSchema(
    LIST_TRANSFER_LIMITS.maxItemCodePoints,
    messages.item_length
  ),
});
const draftEntries = {
  title: ListTitleSchema,
  items: v.pipe(
    v.array(ListItemSchema),
    v.minLength(1, "Include at least one item."),
    v.maxLength(LIST_TRANSFER_LIMITS.maxItems, "Include at most 1,000 items.")
  ),
};

/** The single canonical encoding used by size validation and JSON export. */
export function encodeNativeJson(draft: {
  title: string;
  items: { value: string }[];
}): string {
  return `${JSON.stringify(
    {
      format: "misorter-list",
      version: 1,
      title: draft.title,
      items: draft.items.map(({ value }) => ({ value })),
    },
    null,
    2
  )}\n`;
}

export const utf8ByteLength = (text: string): number =>
  new TextEncoder().encode(text).byteLength;

const fitsCanonicalSize = (draft: {
  title: string;
  items: { value: string }[];
}) => utf8ByteLength(encodeNativeJson(draft)) <= LIST_TRANSFER_LIMITS.maxBytes;

export const ListDraftSchema = v.pipe(
  v.strictObject(draftEntries),
  v.check((draft) => fitsCanonicalSize(draft), messages.canonical_size)
);
export const NativeListSchema = v.pipe(
  v.strictObject({
    format: v.literal("misorter-list"),
    version: v.literal(1),
    ...draftEntries,
  }),
  v.check((draft) => fitsCanonicalSize(draft), messages.canonical_size)
);
export const CreateListSchema = v.pipe(
  ListDraftSchema,
  v.check(
    (draft) => draft.items.length >= 2,
    "Include at least two items to start sorting."
  )
);
export type ListDraft = v.InferOutput<typeof ListDraftSchema>;
export type NativeList = v.InferOutput<typeof NativeListSchema>;

export type DraftResult =
  | { success: true; draft: ListDraft; issues: ImportIssue[] }
  | { success: false; draft?: ListDraft; issues: ImportIssue[] };

export function validationIssues(
  issues: readonly v.BaseIssue<unknown>[]
): ImportIssue[] {
  return issues.map((issue) => ({
    severity: "error",
    code:
      Object.entries(messages).find(
        ([, message]) => message === issue.message
      )?.[0] ?? issue.type,
    message: issue.message,
    path: issue.path?.map(({ key }) =>
      typeof key === "number" ? key : String(key)
    ),
  }));
}

// Keep repairable values without accepting unknown metadata into the draft.
const CandidateSchema = v.object({
  title: v.string(),
  items: v.pipe(
    v.array(v.object({ value: v.string() })),
    v.maxLength(LIST_TRANSFER_LIMITS.maxItems)
  ),
});

export function editableCandidate(input: unknown): ListDraft | undefined {
  const result = v.safeParse(CandidateSchema, input);
  return result.success ? result.output : undefined;
}

export function validateDraft(input: unknown): DraftResult {
  const result = v.safeParse(ListDraftSchema, input);
  return result.success
    ? { success: true, draft: result.output, issues: [] }
    : {
        success: false,
        draft: editableCandidate(input),
        issues: validationIssues(result.issues),
      };
}
