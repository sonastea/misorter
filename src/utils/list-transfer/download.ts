import { utf8ByteLength } from "@/utils/list-transfer/schema";
import type { TransferFormat } from "@/utils/list-transfer/adapters";

export function nativeFilename(title: string): string {
  const cleaned = title
    // Control characters must not reach the browser's suggested filename.
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, "-")
    .replace(/^[.\s]+|[.\s]+$/g, "");
  // Leave room for the extension under common 255-byte filesystem limits.
  let bounded = "";
  for (const character of Array.from(cleaned).slice(0, 80)) {
    if (utf8ByteLength(bounded + character) > 180) break;
    bounded += character;
  }
  bounded = bounded.replace(/[.\s]+$/g, "");
  return `${bounded || "misorter-list"}.misorter.json`;
}

/** Delay revocation until the browser has consumed the download navigation. */
export function downloadList(
  text: string,
  mediaType: string,
  title: string,
  format: TransferFormat = "json"
): void {
  const anchor = document.createElement("a");
  const url = URL.createObjectURL(new Blob([text], { type: mediaType }));
  try {
    anchor.href = url;
    anchor.download = nativeFilename(title).replace(
      /\.misorter\.json$/,
      format === "json" ? ".misorter.json" : format === "csv" ? ".csv" : ".txt"
    );
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
