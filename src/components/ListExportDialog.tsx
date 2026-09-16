import {
  Button,
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useState } from "react";
import { type ListDraft } from "@/utils/list-transfer/schema";
import { serializeNativeJson } from "@/utils/list-transfer/serialize";
import { downloadJson } from "@/utils/list-transfer/download";

export default function ListExportDialog({
  draft,
  onClose,
}: {
  draft: ListDraft;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const result = serializeNativeJson(draft);
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
              Save an exact backup as Misorter JSON.
            </Description>
          </header>
          <p className="transfer-description">
            Includes the title and {draft.items.length} items in their original
            input order, with duplicates and whitespace preserved. Rankings are
            not included.
          </p>
          {!result.success && (
            <div role="alert">
              <p>Return to editing to fix these fields:</p>
              <ul className="transfer-errors">
                {result.issues.map((issue, index) => (
                  <li key={index}>
                    {issue.path?.join(".") || "List"}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && <p role="alert">{error}</p>}
          <div className="transfer-actions transfer-footer">
            <Button className="transfer-button" onClick={onClose}>
              Close
            </Button>
            <Button
              className="transfer-button transfer-primary"
              disabled={!result.success}
              onClick={() => {
                if (!result.success) return;
                try {
                  downloadJson(result.text, result.mediaType, draft.title);
                  setError("");
                } catch {
                  setError(
                    "The download could not be started. Your list is unchanged. Try downloading again."
                  );
                }
              }}
            >
              Download JSON
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
