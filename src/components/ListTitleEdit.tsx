import { List } from "@router/listing";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { trpc } from "src/utils/trpc";

const ListTitleEdit = ({
  title,
  setTitle,
  data,
  listLabel,
  oldTitle,
  setOldTitle,
  setEditTitle,
}: {
  title: string;
  setTitle: (value: string) => void;
  data: Partial<List>;
  listLabel: string;
  oldTitle: string | undefined;
  setOldTitle: (value: string) => void;
  setEditTitle: (value: boolean) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const updateTitle = useMutation({
    ...trpc.listing.updateTitle.mutationOptions(),
    onSuccess: () => {
      toast.success("Successfully updated link to list.");
      setEditTitle(false);
    },
    onError: () => {
      toast.error("Unable to update the list.");
    },
  });

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle === "") {
      setError("Title cannot be empty");
      return;
    }

    if (trimmedTitle === oldTitle) {
      setEditTitle(false);
      return;
    }

    const labelToUse = data && data.label ? data.label : listLabel;
    if (labelToUse) {
      updateTitle.mutate({ label: labelToUse, title: trimmedTitle });
      setOldTitle(trimmedTitle);
    } else {
      setEditTitle(false);
    }
  };

  const handleCancel = () => {
    if (oldTitle) setTitle(oldTitle);
    else setTitle("misorter");
    setEditTitle(false);
  };

  return (
    <div className="home-editTitleForm">
      <div className="home-inputWrapper">
        <input
          ref={inputRef}
          className={`home-editTitleInput ${error ? "home-inputError" : ""}`}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            } else if (e.key === "Escape") {
              e.preventDefault();
              handleCancel();
            }
          }}
          disabled={updateTitle.isPending}
          aria-label="Edit list title"
          aria-invalid={!!error}
          aria-describedby={error ? "title-error" : undefined}
        />
        {error && (
          <span id="title-error" className="home-inputErrorMessage">
            {error}
          </span>
        )}
      </div>
      <div className="home-editActions">
        <button
          className="home-editAction home-editSave"
          onClick={handleSave}
          disabled={updateTitle.isPending}
          aria-label="Save title"
        >
          Save
        </button>
        <button
          className="home-editAction home-editCancel"
          onClick={handleCancel}
          disabled={updateTitle.isPending}
          aria-label="Cancel edit"
        >
          Cancel
        </button>
      </div>
      <p className="home-editHelper">Enter to save, Esc to cancel</p>
    </div>
  );
};

export default ListTitleEdit;
