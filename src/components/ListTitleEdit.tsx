import { List } from "@router/listing";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc, queryClient } from "@/utils/trpc";
import { ListTitleSchema } from "@/utils/list-transfer/schema";
import * as v from "valibot";

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
    onSuccess: (updated) => {
      queryClient.setQueryData(
        trpc.listing.get.queryOptions({ label: updated.label }).queryKey,
        updated
      );
      void queryClient.invalidateQueries(
        trpc.listing.getFeatured.queryFilter()
      );
      void queryClient.invalidateQueries(
        trpc.listing.getAllPaginated.pathFilter()
      );
      setOldTitle(updated.title);
      toast.success("Successfully updated link to list.");
      setEditTitle(false);
    },
    onError: (error) => {
      if (error.data?.code === "NOT_FOUND") {
        queryClient.removeQueries(
          trpc.listing.get.queryFilter({ label: data.label ?? listLabel })
        );
        void queryClient.invalidateQueries(
          trpc.listing.getFeatured.queryFilter()
        );
        void queryClient.invalidateQueries(
          trpc.listing.getAllPaginated.pathFilter()
        );
      }
      setError(error.message);
    },
  });

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSave = () => {
    const result = v.safeParse(ListTitleSchema, title);
    if (!result.success) {
      setError(result.issues[0].message);
      return;
    }

    if (title === oldTitle) {
      setEditTitle(false);
      return;
    }

    const labelToUse = data && data.label ? data.label : listLabel;
    if (labelToUse) {
      updateTitle.mutate({ label: labelToUse, title });
    } else {
      setOldTitle(title);
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
