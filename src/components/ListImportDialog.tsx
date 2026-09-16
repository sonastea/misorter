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
import {
  parseList,
  detectFormat,
  type ImportFormat,
  type TransferFormat,
  type AdapterResult,
} from "@/utils/list-transfer/adapters";
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
  const [format, setFormat] = useState<ImportFormat>("auto");
  const [parsedFormat, setParsedFormat] = useState<TransferFormat>("json");
  const [header, setHeader] = useState(true);
  const [removeMarkers, setRemoveMarkers] = useState(false);
  const [itemColumn, setItemColumn] = useState<number>();
  const [titleColumn, setTitleColumn] = useState<number | null>();
  const [mapping, setMapping] = useState<AdapterResult>();
  const selectedFormat = detectFormat(source, { format, filename: file?.name });
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
  const optionsChanged = () => {
    invalidate();
    setSourceChanged(true);
  };
  const resetMapping = () => {
    setMapping(undefined);
    setItemColumn(undefined);
    setTitleColumn(undefined);
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
      const result = parseList(input, {
        format,
        filename: file?.name,
        header,
        itemColumn,
        titleColumn,
        removeMarkers,
      });
      setMapping(result);
      setIssues(
        result.issues.filter(
          (issue) =>
            issue.code !== "duplicates" &&
            (!result.draft || !repairableCodes.has(issue.code))
        )
      );
      if (result.draft) {
        setPreview(result.draft);
        setRecords(
          result.records || result.draft.items.map((_, index) => index)
        );
        setParsedFormat(result.format);
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
              "Could not read this file. Select it again or paste its contents.",
          },
        ]);
        setSourceChanged(true);
      }
    } finally {
      if (request === revision.current) setPending(false);
    }
  };

  // Structural native errors cannot be repaired by editing a stripped candidate.
  const structuralIssues = issues.filter(
    (issue) =>
      issue.severity === "error" &&
      !(mode === "append" && issue.code === "csv_titles")
  );
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
      <div className="transfer-position transfer-import-position">
        <DialogPanel className="transfer-panel transfer-import-panel">
          <header className="transfer-header transfer-import-header">
            <div>
              <DialogTitle className="transfer-heading">
                Import list
              </DialogTitle>
              <Description className="transfer-description">
                JSON, CSV, or plain text. Up to 1 MiB and 1,000 items, parsed
                locally.
              </Description>
            </div>
            <a
              className="transfer-link"
              href="/examples/twice-this-is-for.misorter.json"
              download
            >
              Download native JSON example
            </a>
          </header>
          <div className="transfer-import-body">
            <section
              className="transfer-import-source"
              aria-label="Source and import options"
            >
              <div className="transfer-import-source-fields">
                <Field className="transfer-field">
                  <Label className="transfer-import-file-label">
                    List file
                  </Label>
                  <Input
                    ref={fileInput}
                    className="transfer-file-input"
                    tabIndex={-1}
                    type="file"
                    accept=".json,.csv,.txt,application/json,text/csv,text/plain"
                    onChange={(event) => {
                      invalidate();
                      resetMapping();
                      setFile(event.target.files?.[0]);
                      setSourceChanged(true);
                    }}
                  />
                  <div className="transfer-file-picker">
                    <Button
                      className="transfer-button"
                      onClick={() => fileInput.current?.click()}
                    >
                      Choose file
                    </Button>
                    <span className="transfer-file-name" role="status">
                      {file?.name || "No file selected"}
                    </span>
                  </div>
                </Field>
                <Field className="transfer-field">
                  <Label>Paste list</Label>
                  <Textarea
                    className="transfer-input transfer-source"
                    rows={3}
                    placeholder="One item per line, or paste JSON or CSV"
                    value={source}
                    onChange={(event) => {
                      invalidate();
                      resetMapping();
                      setSource(event.target.value);
                      setFile(undefined);
                      setSourceChanged(true);
                      if (fileInput.current) fileInput.current.value = "";
                    }}
                  />
                </Field>
                <Field className="transfer-field">
                  <Label>Import format</Label>
                  <Select
                    className="transfer-input"
                    value={format}
                    onChange={(event) => {
                      optionsChanged();
                      resetMapping();
                      setFormat(event.target.value as ImportFormat);
                    }}
                  >
                    <option value="auto">Auto</option>
                    <option value="json">Misorter JSON</option>
                    <option value="csv">CSV</option>
                    <option value="text">Plain text</option>
                  </Select>
                  <Description className="transfer-help">
                    Auto detects files and JSON. Select CSV for pasted tables.
                  </Description>
                </Field>
                {selectedFormat === "csv" && (
                  <>
                    <Field className="transfer-check">
                      <Input
                        type="checkbox"
                        checked={header}
                        onChange={(event) => {
                          optionsChanged();
                          resetMapping();
                          setHeader(event.target.checked);
                        }}
                      />
                      <Label>First nonempty record is a header</Label>
                    </Field>
                    {!!mapping?.columns?.length && (
                      <div className="transfer-mapping">
                        <Field className="transfer-field">
                          <Label>Item column</Label>
                          <Select
                            className="transfer-input"
                            value={itemColumn ?? mapping.itemColumn ?? ""}
                            onChange={(event) => {
                              optionsChanged();
                              setItemColumn(
                                event.target.value === ""
                                  ? undefined
                                  : Number(event.target.value)
                              );
                            }}
                          >
                            <option value="">Choose an item column</option>
                            {mapping.columns.map((column, index) => (
                              <option key={index} value={index}>
                                {column}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field className="transfer-field">
                          <Label>Title column</Label>
                          <Select
                            className="transfer-input"
                            value={
                              titleColumn === null
                                ? ""
                                : (titleColumn ?? mapping.titleColumn ?? "")
                            }
                            onChange={(event) => {
                              optionsChanged();
                              setTitleColumn(
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value)
                              );
                            }}
                          >
                            <option value="">
                              Use filename or default title
                            </option>
                            {mapping.columns.map((column, index) => (
                              <option key={index} value={index}>
                                {column}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                    )}
                  </>
                )}
                {selectedFormat === "text" && (
                  <Field className="transfer-check">
                    <Input
                      type="checkbox"
                      checked={removeMarkers}
                      onChange={(event) => {
                        optionsChanged();
                        setRemoveMarkers(event.target.checked);
                      }}
                    />
                    <Label>Remove list markers</Label>
                  </Field>
                )}
              </div>
              <div className="transfer-import-parse">
                <Button
                  className="transfer-button"
                  disabled={pending || (!file && !source)}
                  onClick={() => void parse()}
                >
                  {pending
                    ? "Reading list…"
                    : preview
                      ? "Parse list again"
                      : "Preview list"}
                </Button>
                <p className="transfer-help">
                  {preview
                    ? "Parsing again replaces preview edits."
                    : "Preview your items before applying them."}
                </p>
              </div>
            </section>
            <section
              className="transfer-import-review"
              aria-label="Import preview"
            >
              <div className="transfer-import-review-heading">
                <h2 className="transfer-import-subheading">Preview</h2>
                {preview && (
                  <span className="transfer-help">
                    {parsedFormat === "text"
                      ? "Plain text"
                      : parsedFormat.toUpperCase()}
                  </span>
                )}
              </div>
              {errors.length > 0 && (
                <ul className="transfer-errors" role="alert">
                  {errors.map((issue, index) => (
                    <li key={index}>
                      {issue.sourceRecord
                        ? `Record ${issue.sourceRecord}`
                        : issue.sourceLine
                          ? `Line ${issue.sourceLine}`
                          : issue.path?.join(".") || "Source"}
                      : {issue.message}
                    </li>
                  ))}
                </ul>
              )}
              {issues.some((issue) => issue.severity === "info") && (
                <ul className="transfer-notices" role="status">
                  {issues
                    .filter((issue) => issue.severity === "info")
                    .map((issue, index) => (
                      <li key={index}>{issue.message}</li>
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
                      onChange={(event) => {
                        setIssues(
                          issues.filter((issue) => issue.code !== "csv_titles")
                        );
                        editPreview({ ...preview, title: event.target.value });
                      }}
                    />
                    {issues.some((issue) => issue.code === "csv_titles") &&
                      mode === "replace" && (
                        <Description className="transfer-help">
                          Titles found: {mapping?.titles?.join("; ")}. Enter the
                          title you want above.
                        </Description>
                      )}
                  </Field>
                  {mode === "append" && (
                    <p className="transfer-help">
                      Keep current title: {current.title}
                    </p>
                  )}
                  <div className="transfer-preview">
                    {preview.items
                      .slice(start, start + 50)
                      .map((item, offset) => {
                        const index = start + offset;
                        const rowIssues =
                          imported?.issues.filter(
                            (issue) =>
                              issue.path?.[0] === "items" &&
                              issue.path[1] === index
                          ) || [];
                        return (
                          <Field className="transfer-row" key={records[index]}>
                            <Label>
                              Item {index + 1}{" "}
                              <span className="transfer-help">
                                (
                                {parsedFormat === "json"
                                  ? `source items[${records[index]}]`
                                  : parsedFormat === "csv"
                                    ? `source record ${records[index]}`
                                    : `source line ${records[index]}`}
                                )
                              </span>
                            </Label>
                            <Textarea
                              className="transfer-input"
                              value={item.value}
                              rows={Math.min(
                                4,
                                Math.max(1, item.value.split(/\r\n?|\n/).length)
                              )}
                              aria-invalid={rowIssues.length > 0}
                              aria-describedby={
                                rowIssues.length
                                  ? `transfer-row-${index}`
                                  : undefined
                              }
                              onChange={(event) =>
                                editPreview({
                                  ...preview,
                                  items: preview.items.map((row, i) =>
                                    i === index
                                      ? { value: event.target.value }
                                      : row
                                  ),
                                })
                              }
                            />
                            {rowIssues.length > 0 && (
                              <p id={`transfer-row-${index}`}>
                                {rowIssues
                                  .map((issue) => issue.message)
                                  .join(" ")}
                              </p>
                            )}
                            <Button
                              className="transfer-button"
                              aria-label={`Remove item ${index + 1}`}
                              onClick={() => {
                                editPreview({
                                  ...preview,
                                  items: preview.items.filter(
                                    (_, i) => i !== index
                                  ),
                                });
                                setRecords(
                                  records.filter((_, i) => i !== index)
                                );
                                setPage(
                                  Math.min(
                                    page,
                                    Math.max(
                                      0,
                                      Math.ceil(
                                        (preview.items.length - 1) / 50
                                      ) - 1
                                    )
                                  )
                                );
                              }}
                            >
                              <span aria-hidden="true">×</span>
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
                        Page {page + 1} of{" "}
                        {Math.ceil(preview.items.length / 50)}
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
                </>
              )}
              {!preview && (
                <div className="transfer-import-empty">
                  <p>Your list will appear here.</p>
                  <p className="transfer-help">
                    Choose a file or paste your items, then select Preview list.
                    You can edit the title and items before applying.
                  </p>
                </div>
              )}
            </section>
          </div>
          <div className="transfer-actions transfer-footer transfer-import-footer">
            {preview && current.items.length > 0 && (
              <Field className="transfer-field transfer-import-mode">
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
              </Field>
            )}
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
