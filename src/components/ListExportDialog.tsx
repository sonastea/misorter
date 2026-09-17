import {
  Button,
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
  Field,
  Label,
  Select,
} from "@headlessui/react";
import { useEffect, useRef, useState } from "react";
import { type ListDraft } from "@/utils/list-transfer/schema";
import { serializeList } from "@/utils/list-transfer/serialize";
import type { TransferFormat } from "@/utils/list-transfer/adapters";
import { downloadList } from "@/utils/list-transfer/download";
import ListTransferStatus from "@/components/ListTransferStatus";

export default function ListExportDialog({
  draft,
  onClose,
}: {
  draft: ListDraft;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [format, setFormat] = useState<TransferFormat>("json");
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied">(
    "idle"
  );
  const copyRevision = useRef(0);
  useEffect(
    () => () => {
      copyRevision.current++;
    },
    []
  );
  const result = serializeList(draft, format);
  const copy = async () => {
    if (!result.success || copyState === "copying") return;
    const request = ++copyRevision.current;
    setCopyState("copying");
    setDownloadStarted(false);
    setError("");
    try {
      await navigator.clipboard.writeText(result.text);
      if (request === copyRevision.current) setCopyState("copied");
    } catch {
      if (request !== copyRevision.current) return;
      setCopyState("idle");
      setError(
        "Could not copy to the clipboard. Try again or download the file instead."
      );
    }
  };
  return (
    <Dialog open onClose={onClose} className="transfer-dialog">
      <div className="transfer-backdrop" aria-hidden="true" />
      <div className="transfer-position">
        <DialogPanel className="transfer-panel transfer-panel-small">
          <header className="transfer-header">
            <DialogTitle className="transfer-heading">
              Export input list
            </DialogTitle>
            <Description className="transfer-description">
              Save your input list for a backup, a spreadsheet, or another app.
            </Description>
          </header>
          <p className="transfer-description">
            {draft.items.length} items in their original input order. Rankings
            are not included.
          </p>
          <Field className="transfer-field">
            <Label>Export format</Label>
            <Select
              className="transfer-input"
              value={format}
              onChange={(event) => {
                copyRevision.current++;
                setCopyState("idle");
                setDownloadStarted(false);
                setFormat(event.target.value as TransferFormat);
                setError("");
              }}
            >
              <option value="json">Misorter JSON · exact backup</option>
              <option value="csv">CSV · spreadsheet</option>
              <option value="text">Plain text · items only</option>
            </Select>
            <Description className="transfer-help">
              {format === "json"
                ? "Preserves the title and item text exactly, including whitespace and duplicates."
                : format === "csv"
                  ? "Includes a title,value header and repeats the title in each row."
                  : "Items only; title not included."}
            </Description>
          </Field>
          {result.success &&
            result.notices?.map((notice) => (
              <p className="transfer-help" role="status" key={notice}>
                {notice}
              </p>
            ))}
          {!result.success && (
            <div role="alert">
              <p>Before exporting:</p>
              <ul className="transfer-errors">
                {result.issues.map((issue, index) => (
                  <li key={index}>
                    {issue.path?.join(".") || "List"}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ListTransferStatus
            tone={
              error
                ? "error"
                : copyState === "copied" || downloadStarted
                  ? "success"
                  : "info"
            }
            message={
              error ||
              (downloadStarted
                ? "Download started."
                : copyState === "copied"
                  ? `${format === "text" ? "Plain text" : format.toUpperCase()} copied to clipboard.`
                  : copyState === "copying"
                    ? "Copying to clipboard…"
                    : "")
            }
          />
          <div className="transfer-actions transfer-footer transfer-export-actions">
            <Button className="transfer-button" onClick={onClose}>
              Close
            </Button>
            <Button
              className="transfer-button transfer-icon-button"
              aria-label="Copy to clipboard"
              disabled={!result.success || copyState === "copying"}
              onClick={() => void copy()}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3M9 3h6v4H9z"
                />
              </svg>
              Copy
            </Button>
            <Button
              className="transfer-button transfer-primary transfer-icon-button"
              aria-label={`Download ${format === "text" ? "TXT" : format.toUpperCase()}`}
              disabled={!result.success}
              onClick={() => {
                if (!result.success) return;
                copyRevision.current++;
                setCopyState("idle");
                setDownloadStarted(false);
                try {
                  downloadList(
                    result.text,
                    result.mediaType,
                    draft.title,
                    format
                  );
                  setError("");
                  setDownloadStarted(true);
                } catch {
                  setError(
                    "The download could not be started. Your list is unchanged. Try downloading again."
                  );
                }
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v12m-5-5 5 5 5-5M5 16v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"
                />
              </svg>
              Download
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
