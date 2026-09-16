import {
  Button,
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
  Field,
  Input,
  Label,
  Select,
  Textarea,
} from "@headlessui/react";
import { useEffect, useRef, useState } from "react";
import { parseNativeJson } from "@/utils/list-transfer/parse";
import { combineDrafts, type ImportMode } from "@/utils/list-transfer/draft";
import {
  type ImportIssue,
  type ListDraft,
  LIST_TRANSFER_LIMITS,
  validateDraft,
} from "@/utils/list-transfer/schema";

const repairableCodes = new Set([
  "blank",
  "nul",
  "title_length",
  "item_length",
  "canonical_size",
  "min_length",
  "max_length",
]);

export default function ListImportDialog({
  current,
  onApply,
  onClose,
}: {
  current: ListDraft;
  onApply: (draft: ListDraft, mode: ImportMode) => void;
  onClose: () => void;
}) {
  const [source, setSource] = useState("");
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<ListDraft>();
  const [records, setRecords] = useState<number[]>([]);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [mode, setMode] = useState<ImportMode>("replace");
  const [pending, setPending] = useState(false);
  const [sourceChanged, setSourceChanged] = useState(false);
  const [page, setPage] = useState(0);
  const revision = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      revision.current++;
    },
    []
  );

  const invalidate = () => {
    revision.current++;
    setPending(false);
  };
  const close = () => {
    invalidate();
    onClose();
  };
  const parse = async () => {
    const request = ++revision.current;
    setPending(true);
    try {
      if (file && file.size > LIST_TRANSFER_LIMITS.maxBytes) {
        setIssues([
          {
            severity: "error",
            code: "input_size",
            message: "Choose a file at most 1 MiB (1,048,576 bytes).",
          },
        ]);
        setSourceChanged(true);
        return;
      }
      const input = file ? new Uint8Array(await file.arrayBuffer()) : source;
      if (request !== revision.current) return;
      const result = parseNativeJson(input);
      setIssues(
        result.issues.filter(
          (issue) =>
            issue.severity === "error" &&
            (!result.draft || !repairableCodes.has(issue.code))
        )
      );
      if (result.draft) {
        setPreview(result.draft);
        setRecords(result.draft.items.map((_, index) => index));
        setPage(0);
      }
      setSourceChanged(!result.draft);
    } catch {
      if (request === revision.current) {
        setIssues([
          {
            severity: "error",
            code: "file_read",
            message:
              "Could not read this file. Select it again or paste its JSON contents.",
          },
        ]);
        setSourceChanged(true);
      }
    } finally {
      if (request === revision.current) setPending(false);
    }
  };

  // Structural native errors cannot be repaired by editing a stripped candidate.
  const structuralIssues = issues;
  const imported = preview && validateDraft(preview);
  const combined = preview && combineDrafts(current, preview, mode);
  const errors = [...structuralIssues, ...(combined?.issues || [])];
  const canApply =
    preview &&
    combined?.success &&
    !structuralIssues.length &&
    !pending &&
    !sourceChanged;
  const duplicateCount = preview
    ? preview.items.length -
      new Set(preview.items.map((item) => item.value)).size
    : 0;
  const editPreview = (next: ListDraft) => {
    invalidate();
    setPreview(next);
  };
  const start = page * 50;
  return (
    <Dialog open onClose={close} className="transfer-dialog">
      <div className="transfer-backdrop" aria-hidden="true" />
      <div className="transfer-position">
        <DialogPanel className="transfer-panel">
          <header className="transfer-header">
            <DialogTitle className="transfer-heading">Import list</DialogTitle>
            <Description className="transfer-description">
              Choose a Misorter JSON file or paste its contents. Parsed locally
              on your device.
            </Description>
            <a
              className="transfer-link"
              href="/examples/twice-this-is-for.misorter.json"
              download
            >
              Download native JSON example
            </a>
          </header>
          <Field className="transfer-field">
            <Label>JSON file</Label>
            <Input
              ref={fileInput}
              className="transfer-file-input"
              tabIndex={-1}
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                invalidate();
                setFile(event.target.files?.[0]);
                setSourceChanged(true);
              }}
            />
            <div className="transfer-file-picker">
              <Button
                className="transfer-button"
                onClick={() => fileInput.current?.click()}
              >
                Choose JSON file
              </Button>
              <span className="transfer-file-name" role="status">
                {file?.name || "No file selected"}
              </span>
            </div>
            <Description className="transfer-help">
              Up to 1 MiB and 1,000 items.
            </Description>
          </Field>
          <Field className="transfer-field">
            <Label>Paste JSON</Label>
            <Textarea
              className="transfer-input transfer-source"
              value={source}
              onChange={(event) => {
                invalidate();
                setSource(event.target.value);
                setFile(undefined);
                setSourceChanged(true);
                if (fileInput.current) fileInput.current.value = "";
              }}
            />
          </Field>
          <p className="transfer-help">
            Parsing again replaces any preview edits. Changing the source
            requires parsing again.
          </p>
          <Button
            className="transfer-button"
            disabled={pending || (!file && !source)}
            onClick={() => void parse()}
          >
            {pending
              ? "Reading JSON…"
              : preview
                ? "Parse JSON again"
                : "Preview JSON"}
          </Button>
          {errors.length > 0 && (
            <ul className="transfer-errors" role="alert">
              {errors.map((issue, index) => (
                <li key={index}>
                  {issue.path?.join(".") || "Source"}: {issue.message}
                </li>
              ))}
            </ul>
          )}
          {preview && (
            <>
              <div className="transfer-summary" aria-live="polite">
                {preview.items.length} items · {duplicateCount} duplicate
                item(s) preserved
              </div>
              <Field className="transfer-field">
                <Label>Preview title</Label>
                <Input
                  className="transfer-input"
                  value={preview.title}
                  disabled={mode === "append"}
                  aria-invalid={
                    mode === "replace" &&
                    !!imported?.issues.some(
                      (issue) => issue.path?.[0] === "title"
                    )
                  }
                  onChange={(event) =>
                    editPreview({ ...preview, title: event.target.value })
                  }
                />
              </Field>
              <div className="transfer-preview">
                {preview.items.slice(start, start + 50).map((item, offset) => {
                  const index = start + offset;
                  const rowIssues =
                    imported?.issues.filter(
                      (issue) =>
                        issue.path?.[0] === "items" && issue.path[1] === index
                    ) || [];
                  return (
                    <Field className="transfer-row" key={records[index]}>
                      <Label>
                        Item {index + 1}{" "}
                        <span className="transfer-help">
                          (source items[{records[index]}])
                        </span>
                      </Label>
                      <Textarea
                        className="transfer-input"
                        value={item.value}
                        rows={2}
                        aria-invalid={rowIssues.length > 0}
                        aria-describedby={
                          rowIssues.length ? `transfer-row-${index}` : undefined
                        }
                        onChange={(event) =>
                          editPreview({
                            ...preview,
                            items: preview.items.map((row, i) =>
                              i === index ? { value: event.target.value } : row
                            ),
                          })
                        }
                      />
                      {rowIssues.length > 0 && (
                        <p id={`transfer-row-${index}`}>
                          {rowIssues.map((issue) => issue.message).join(" ")}
                        </p>
                      )}
                      <Button
                        className="transfer-button"
                        aria-label={`Remove item ${index + 1}`}
                        onClick={() => {
                          editPreview({
                            ...preview,
                            items: preview.items.filter((_, i) => i !== index),
                          });
                          setRecords(records.filter((_, i) => i !== index));
                          setPage(
                            Math.min(
                              page,
                              Math.max(
                                0,
                                Math.ceil((preview.items.length - 1) / 50) - 1
                              )
                            )
                          );
                        }}
                      >
                        Remove
                      </Button>
                    </Field>
                  );
                })}
              </div>
              {preview.items.length > 50 && (
                <div className="transfer-actions">
                  <Button
                    className="transfer-button"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous items
                  </Button>
                  <span>
                    Page {page + 1} of {Math.ceil(preview.items.length / 50)}
                  </span>
                  <Button
                    className="transfer-button"
                    disabled={start + 50 >= preview.items.length}
                    onClick={() => setPage(page + 1)}
                  >
                    Next items
                  </Button>
                </div>
              )}
              {current.items.length > 0 && (
                <Field className="transfer-field">
                  <Label>Apply as</Label>
                  <Select
                    className="transfer-input"
                    value={mode}
                    onChange={(event) => {
                      invalidate();
                      setMode(event.target.value as ImportMode);
                    }}
                  >
                    <option value="replace">Replace current list</option>
                    <option value="append">Append items</option>
                  </Select>
                  {mode === "append" && (
                    <p>Keep current title: {current.title}</p>
                  )}
                </Field>
              )}
            </>
          )}
          <div className="transfer-actions transfer-footer">
            <Button className="transfer-button" onClick={close}>
              Cancel
            </Button>
            <Button
              className="transfer-button transfer-primary"
              disabled={!canApply}
              onClick={() => {
                if (canApply && preview) {
                  invalidate();
                  onApply(preview, mode);
                }
              }}
            >
              Use imported list · {mode === "append" ? "Append" : "Replace"} ·{" "}
              {(preview?.items.length || 0) +
                (mode === "append" ? current.items.length : 0)}{" "}
              items
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
