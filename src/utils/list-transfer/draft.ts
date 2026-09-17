import { type ListDraft, validateDraft } from "@/utils/list-transfer/schema";

export type ImportMode = "replace" | "append";

/** Identity belongs to the active draft, never to a portable document. */
export function importedItems(
  current: { id: string; value: string }[],
  imported: ListDraft,
  mode: ImportMode
) {
  const rows = imported.items.map(({ value }) => ({
    id: crypto.randomUUID(),
    value,
  }));
  return mode === "append" ? [...current, ...rows] : rows;
}

export function combineDrafts(
  current: ListDraft,
  imported: ListDraft,
  mode: ImportMode
) {
  return validateDraft(
    mode === "append"
      ? {
          title: current.title,
          items: [...current.items, ...imported.items].map(({ value }) => ({
            value,
          })),
        }
      : {
          title: imported.title,
          items: imported.items.map(({ value }) => ({ value })),
        }
  );
}
