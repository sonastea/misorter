import {
  KeyboardEvent,
  memo,
  useCallback,
  type RefObject,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, Input, Textarea } from "@headlessui/react";
import { loadImport, loadExport, loadSort } from "@/utils/feature-loaders";
import { useFeatureRequest } from "@/hooks/useFeatureRequest";
import FeatureLoadStatus from "@/components/FeatureLoadStatus";
import { CreateListSchema, type ListDraft } from "@/utils/list-transfer/schema";
import * as v from "valibot";
import { type ImportMode } from "@/utils/list-transfer/draft";
import type { ListItem } from "@/routes/index";

interface SetupProps {
  onStartSort: (
    module: Awaited<ReturnType<typeof loadSort>>,
    draft: ListDraft
  ) => void;
  onImport: (draft: ListDraft, mode: ImportMode) => void;
  importDisabled: boolean;
  title: string;
  list: ListItem[];
  initialListSize: number;
  setList: (x: ListItem[] | ((prev: ListItem[]) => ListItem[])) => void;
  getListOnce: boolean;
  setGetListOnce: (x: boolean) => void;
  getItemDraft: () => string;
  onItemDraftChange: (value: string) => void;
  setEditTitle: (x: boolean) => void;
}

const AddItemInput = memo(function AddItemInput({
  inputRef,
  getItemDraft,
  onItemDraftChange,
  onAdd,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  getItemDraft: () => string;
  onItemDraftChange: (value: string) => void;
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState(getItemDraft);
  const updateDraft = (next: string) => {
    setValue(next);
    onItemDraftChange(next);
  };
  const add = () => {
    onAdd(value);
    updateDraft("");
  };

  return (
    <div className="home-inputContainer">
      <Input
        ref={inputRef}
        aria-label="Add an item to the list"
        className="home-listInput"
        type="text"
        placeholder="Add an item to the list"
        name="newItem"
        value={value}
        onChange={(event) => updateDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.code === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            add();
          }
        }}
      />
      <Button
        aria-label="Add item to the list"
        className="home-inputButton"
        onClick={add}
        type="button"
      >
        <svg className="home-inputButtonIcon" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"
          />
        </svg>
      </Button>
    </div>
  );
});

const ItemRow = memo(function ItemRow({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: ListItem;
  index: number;
  onChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="home-item">
      <Textarea
        className="transfer-item-editor"
        aria-label={`Edit item ${index + 1}`}
        value={item.value}
        rows={Math.min(6, item.value.split(/\r\n|\r|\n/).length)}
        onChange={(event) => onChange(item.id, event.target.value)}
        onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
          if (event.code === "Escape") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
      <svg
        className="home-removeItem"
        style={{ width: "1.75em", height: "1.75em" }}
        viewBox="0 0 24 24"
        onClick={(event) => {
          event.currentTarget.parentElement?.classList.add("home-removing");
          onRemove(item.id);
        }}
      >
        <path
          fill="currentColor"
          d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"
        />
      </svg>
    </li>
  );
});

const Setup = ({
  onStartSort,
  onImport,
  importDisabled,
  title,
  list,
  initialListSize,
  setList,
  getListOnce,
  setGetListOnce,
  getItemDraft,
  onItemDraftChange,
  setEditTitle,
}: SetupProps) => {
  const [importOpen, setImportOpen] = useState(false);
  const [exportDraft, setExportDraft] = useState<ListDraft>();
  const [validationError, setValidationError] = useState<string>();
  const [inputVersion, setInputVersion] = useState(0);
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
  const latestStart = useRef<
    (module: Awaited<ReturnType<typeof loadSort>>) => void
  >(() => {});
  const openImport = () => {
    void importer.request(() => setImportOpen(true));
  };
  const openExport = () => {
    void exporter.request(() => setExportDraft(exportSnapshot.current));
  };

  const checkList = () => {
    setValidationError(undefined);
    if (list.length < 2) {
      setValidationError("Include at least two items to start sorting.");
      return false;
    }

    // fetched a list and it's the same list
    if (!getListOnce || initialListSize !== list.length) {
      const result = v.safeParse(CreateListSchema, currentDraft);
      if (!result.success) {
        setValidationError(
          result.issues.map((issue) => issue.message).join(" ")
        );
        return false;
      }
    }
    return true;
  };
  // Read the latest editor state after a delayed download, then repeat preflight.
  useLayoutEffect(() => {
    latestStart.current = (module) => {
      if (!checkList()) return;
      onStartSort(module, currentDraft);
      window.scrollTo({ top: 0 });
    };
  });
  const start = () => {
    if (!checkList()) return;
    void sorter.request((module) => {
      latestStart.current(module);
    });
  };

  const resetList = () => {
    setEditTitle(false);
    setList([]);
  };

  const addItemToList = useCallback(
    (value: string) => {
      setList((prev: ListItem[]) => [
        { id: crypto.randomUUID(), value },
        ...prev,
      ]);
      // try resetting getListOnce assuming new items considers it a different list
      setGetListOnce(false);
    },
    [setList, setGetListOnce]
  );

  const updateItem = useCallback(
    (id: string, value: string) => {
      setList((previous) =>
        previous.map((item) => (item.id === id ? { ...item, value } : item))
      );
      setGetListOnce(false);
    },
    [setList, setGetListOnce]
  );

  const removeItem = useCallback(
    (id: string) => {
      setList((previous) => previous.filter((item) => item.id !== id));
      setGetListOnce(false);
    },
    [setList, setGetListOnce]
  );

  return (
    <>
      <AddItemInput
        key={inputVersion}
        inputRef={setupRef}
        getItemDraft={getItemDraft}
        onItemDraftChange={onItemDraftChange}
        onAdd={addItemToList}
      />
      <div
        className="home-listUtilities"
        role="group"
        aria-label="List import and export"
      >
        <Button
          className="home-listUtility"
          disabled={importDisabled}
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
        {list.map((item, index) => (
          <ItemRow
            key={item.id}
            item={item}
            index={index}
            onChange={updateItem}
            onRemove={removeItem}
          />
        ))}
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
          aria-busy={sorter.loading}
        >
          Start
        </button>
      </div>
      {importOpen && ListImportDialog && (
        <ListImportDialog
          current={currentDraft}
          onClose={() => setImportOpen(false)}
          onApply={(draft, mode) => {
            onImport(draft, mode);
            setInputVersion((version) => version + 1);
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
