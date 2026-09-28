import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ChangeEvent,
  KeyboardEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, Textarea } from "@headlessui/react";
import { loadImport, loadExport, loadSort } from "@/utils/feature-loaders";
import { useFeatureRequest } from "@/hooks/useFeatureRequest";
import FeatureLoadStatus from "@/components/FeatureLoadStatus";
import { CreateListSchema, type ListDraft } from "@/utils/list-transfer/schema";
import * as v from "valibot";
import { type ImportMode } from "@/utils/list-transfer/draft";
import { toast } from "sonner";
import type { ListItem } from "@/routes/index";
import { trpc, queryClient } from "@/utils/trpc";

interface SetupProps {
  onSortLoaded: (module: Awaited<ReturnType<typeof loadSort>>) => void;
  onImport: (draft: ListDraft, mode: ImportMode) => void;
  importDisabled: boolean;
  title: string;
  list: ListItem[];
  initialListSize: number;
  setList: (x: ListItem[] | ((prev: ListItem[]) => ListItem[])) => void;
  getListOnce: boolean;
  setGetListOnce: (x: boolean) => void;
  newItem: string;
  setEditTitle: (x: boolean) => void;
  setNewItem: (x: string) => void;
  setStartSort: (x: boolean) => void;
  label?: string;
}

const Setup = ({
  onSortLoaded,
  onImport,
  importDisabled,
  title,
  list,
  initialListSize,
  setList,
  getListOnce,
  setGetListOnce,
  newItem,
  setEditTitle,
  setNewItem,
  setStartSort,
}: SetupProps) => {
  const navigate = useNavigate();
  const [importOpen, setImportOpen] = useState(false);
  const [exportDraft, setExportDraft] = useState<ListDraft>();
  const [validationError, setValidationError] = useState<string>();
  const setupRef = useRef<HTMLInputElement>(null);
  const importer = useFeatureRequest(loadImport);
  const exporter = useFeatureRequest(loadExport);
  const sorter = useFeatureRequest(loadSort);
  const ListImportDialog = importer.module?.default;
  const ListExportDialog = exporter.module?.default;
  const currentDraft = useMemo(
    () => ({ title, items: list.map(({ value }) => ({ value })) }),
    [title, list]
  );
  const exportSnapshot = useRef<ListDraft>(undefined);
  const latestStart = useRef<() => void>(() => {});
  const openImport = () => {
    void importer.request(() => setImportOpen(true));
  };
  const openExport = () => {
    void exporter.request(() => setExportDraft(exportSnapshot.current));
  };

  const createVisit = useMutation(trpc.listing.createVisit.mutationOptions());

  const createList = useMutation({
    ...trpc.listing.create.mutationOptions(),
    onSuccess: (data) => {
      queryClient.setQueryData(
        trpc.listing.get.queryOptions({ label: data.label }).queryKey,
        data
      );
      navigate({ to: "/", search: { list: data.label } });
      setGetListOnce(true);
      setStartSort(true);
      // Create a visit for the newly created list
      createVisit.mutate({ label: data.label, source: "NEW" });
      toast.success("Successfully created link to list.");
    },
    onError: (error) => {
      if (error.data?.code === "BAD_REQUEST") {
        setValidationError(error.message);
        return;
      }
      setStartSort(true);
      toast.error("Unable to create link to list.");
    },
  });

  const checkList = (persist = true) => {
    setValidationError(undefined);
    if (list.length < 2) {
      setValidationError("Include at least two items to start sorting.");
      return false;
    }

    const sanitizedList = list.map((item) => {
      return { value: item.value };
    });

    // fetched a list and it's the same list
    if (getListOnce && initialListSize === list.length) {
      if (persist) setStartSort(true);
    } else {
      const result = v.safeParse(CreateListSchema, {
        title,
        items: sanitizedList,
      });
      if (!result.success) {
        setValidationError(
          result.issues.map((issue) => issue.message).join(" ")
        );
        return false;
      }
      if (persist) createList.mutate(result.output);
    }

    if (persist) window.scrollTo({ top: 0 });
    return true;
  };
  // Read the latest editor state after a delayed download, then repeat preflight.
  useLayoutEffect(() => {
    latestStart.current = () => {
      checkList();
    };
  });
  const start = () => {
    if (createList.isPending || !checkList(false)) return;
    void sorter.request((module) => {
      onSortLoaded(module);
      latestStart.current();
    });
  };

  const resetList = () => {
    setEditTitle(false);
    setList([]);
  };

  const addItemToList = () => {
    setList((prev: ListItem[]) => [
      { id: crypto.randomUUID(), value: newItem },
      ...prev,
    ]);
    setNewItem("");
    // try resetting getListOnce assuming new items considers it a different list
    setGetListOnce(false);
  };

  const creatingList = createList.isPending;

  return (
    <>
      <div className="home-inputContainer">
        <input
          ref={setupRef}
          aria-label="Add an item to the list"
          className="home-listInput"
          type="text"
          placeholder="Add an item to the list"
          name="newItem"
          value={newItem}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setNewItem(e.target.value);
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.code === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              addItemToList();
            }
          }}
        />
        <button
          aria-label="Add item to the list"
          className="home-inputButton"
          onClick={() => addItemToList()}
          type="button"
        >
          <svg className="home-inputButtonIcon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"
            />
          </svg>
        </button>
      </div>
      <div
        className="home-listUtilities"
        role="group"
        aria-label="List import and export"
      >
        <Button
          className="home-listUtility"
          disabled={importDisabled || creatingList}
          aria-disabled={importer.loading}
          onClick={openImport}
        >
          Import list
        </Button>
        <Button
          className="home-listUtility"
          aria-disabled={exporter.loading}
          onClick={() => {
            if (exporter.loading) return;
            // Controlled editors commit on every input, including paste and IME.
            if (
              document.activeElement instanceof HTMLElement &&
              document.activeElement.matches("input, textarea")
            )
              document.activeElement.blur();
            exportSnapshot.current = currentDraft;
            openExport();
          }}
        >
          Export list
        </Button>
      </div>
      <FeatureLoadStatus
        name="import"
        {...importer}
        onCancel={importer.cancel}
        onRetry={openImport}
      />
      <FeatureLoadStatus
        name="export"
        {...exporter}
        onCancel={exporter.cancel}
        onRetry={openExport}
      />
      <FeatureLoadStatus
        name="sorting"
        {...sorter}
        onCancel={sorter.cancel}
        onRetry={start}
      />
      <ul className="home-listTable">
        {list &&
          list.map((item: ListItem, index) => {
            return (
              <li className="home-item" key={item.id}>
                <Textarea
                  className="transfer-item-editor"
                  aria-label={`Edit item ${index + 1}`}
                  value={item.value}
                  rows={Math.min(6, item.value.split(/\r\n|\r|\n/).length)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setList((previous) =>
                      previous.map((row) =>
                        row.id === item.id ? { ...row, value } : row
                      )
                    );
                    setGetListOnce(false);
                  }}
                  onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                    if (e.code === "Escape") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                />
                <svg
                  className="home-removeItem"
                  style={{ width: "1.75em", height: "1.75em" }}
                  viewBox="0 0 24 24"
                  onClick={(e) => {
                    e.currentTarget.parentElement?.classList.add(
                      "home-removing"
                    );
                    setList((previous) =>
                      previous.filter((it) => it.id !== item.id)
                    );
                    setGetListOnce(false);
                  }}
                >
                  <path
                    fill="currentColor"
                    d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"
                  />
                </svg>
              </li>
            );
          })}
      </ul>
      {validationError && (
        <p className="home-inputErrorMessage" role="alert">
          {validationError}
        </p>
      )}
      <div className="home-listButtons">
        <button className="home-reset" onClick={resetList}>
          Reset
        </button>
        <button
          className="home-start"
          onClick={start}
          aria-disabled={sorter.loading}
          aria-busy={sorter.loading || creatingList}
          disabled={creatingList}
        >
          {creatingList ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 38 38"
              xmlns="http://www.w3.org/2000/svg"
              stroke="currentColor"
              aria-label="Loading"
            >
              <g fill="none" fillRule="evenodd">
                <g transform="translate(1 1)" strokeWidth="2">
                  <circle strokeOpacity=".5" cx="18" cy="18" r="18" />
                  <path d="M36 18c0-9.94-8.06-18-18-18">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 18 18"
                      to="360 18 18"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </path>
                </g>
              </g>
            </svg>
          ) : (
            "Start"
          )}
        </button>
      </div>
      {importOpen && ListImportDialog && (
        <ListImportDialog
          current={currentDraft}
          onClose={() => setImportOpen(false)}
          onApply={(draft, mode) => {
            onImport(draft, mode);
            setImportOpen(false);
            requestAnimationFrame(() => setupRef.current?.focus());
          }}
        />
      )}
      {exportDraft && ListExportDialog && (
        <ListExportDialog
          draft={exportDraft}
          onClose={() => setExportDraft(undefined)}
        />
      )}
    </>
  );
};

export default Setup;
