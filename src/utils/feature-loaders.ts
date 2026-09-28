import * as urls from "virtual:feature-urls";

/** Native module maps cache failed fetches; retry a fresh entry URL, never reload the document. */
function retryable<T>(load: () => Promise<T>, url: string) {
  let pending: Promise<T> | undefined;
  let attempt = 0;
  return () => {
    pending ??= (
      attempt === 0
        ? load()
        : (import(/* @vite-ignore */ `${url}?retry=${attempt}`) as Promise<T>)
    ).catch((error: unknown) => {
      pending = undefined;
      attempt++;
      throw error;
    });
    return pending;
  };
}

export const loadImport = retryable(
  () => import("@/components/ListImportDialog"),
  urls.ListImportDialog
);
export const loadExport = retryable(
  () => import("@/components/ListExportDialog"),
  urls.ListExportDialog
);
export const loadSort = retryable(() => import("@/components/Sort"), urls.Sort);
