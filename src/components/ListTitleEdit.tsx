import { Button, Description, Field, Input, Label } from "@headlessui/react";
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
      toast.success("List title updated.");
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
      inputRef.current?.focus();
    },
  });

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    if (updateTitle.isPending) return;

    const result = v.safeParse(ListTitleSchema, title);
    if (!result.success) {
      setError(result.issues[0].message);
      inputRef.current?.focus();
      return;
    }
    setError(null);

    if (title === oldTitle) {
      setEditTitle(false);
      return;
    }

    const labelToUse = data && data.label ? data.label : listLabel;
    if (labelToUse) {
      updateTitle.mutate({ label: labelToUse, title });
    } else {
      setOldTitle(title);
      toast.success("List title updated.");
      setEditTitle(false);
    }
  };

  const handleCancel = () => {
    if (updateTitle.isPending) return;
    setTitle(oldTitle ?? "misorter");
    setEditTitle(false);
  };

  return (
    <form
      className="home-editTitleForm"
      aria-label="Change list title"
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (event.key === "Escape") {
          event.preventDefault();
          handleCancel();
        }
      }}
    >
      <Field className="home-inputWrapper">
        <Label className="home-editTitleLabel">Edit list title</Label>
        <Input
          ref={inputRef}
          className={`home-editTitleInput ${error ? "home-inputError" : ""}`}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            // Confirming an IME candidate must not submit the title.
            if (
              e.key === "Enter" &&
              (e.nativeEvent.isComposing || e.keyCode === 229)
            ) {
              e.preventDefault();
            }
          }}
          readOnly={updateTitle.isPending}
          aria-busy={updateTitle.isPending}
          invalid={!!error}
          enterKeyHint="done"
        />
        {error && (
          <Description
            as="span"
            className="home-inputErrorMessage"
            role="alert"
          >
            {error}
          </Description>
        )}
        <Description className="home-editHelper">
          Enter to save, Esc to cancel
        </Description>
      </Field>
      <div className="home-editActions">
        <Button
          type="submit"
          className="home-editAction home-editSave"
          disabled={updateTitle.isPending}
        >
          {updateTitle.isPending ? "Saving…" : "Save title"}
        </Button>
        <Button
          type="button"
          className="home-editAction home-editCancel"
          onClick={handleCancel}
          disabled={updateTitle.isPending}
          aria-label="Cancel edit"
        >
          Cancel
        </Button>
      </div>
      <span className="sr-only" role="status">
        {updateTitle.isPending ? "Saving list title…" : ""}
      </span>
    </form>
  );
};

export default ListTitleEdit;
