import { List } from "@router/listing";
import { ChangeEvent, RefObject } from "react";
import { toast } from "react-toastify";
import { trpc } from "src/utils/trpc";

const ListTitleEdit = ({
  title,
  setTitle,
  textAreaRef,
  data,
  listLabel,
  oldTitle,
  setOldTitle,
  setEditTitle,
}: {
  title: string;
  setTitle: Function;
  textAreaRef: RefObject<HTMLTextAreaElement | null>;
  data: Partial<List>;
  listLabel: string;
  oldTitle: string | undefined;
  setOldTitle: Function;
  setEditTitle: Function;
}) => {
  const updateTitle = trpc.listing.updateTitle.useMutation({
    onSuccess: () => {
      toast.success("Successfully updated link to list.");
    },
    onError: () => {
      toast.error("Unable to update the list.");
    },
  });

  return (
    <textarea
      autoFocus
      className="home-editTitle"
      value={title}
      ref={textAreaRef}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
        setTitle(e.target.value);
      }}
      onBlur={() => setEditTitle(false)}
      onFocus={(e) =>
        e.currentTarget.setSelectionRange(
          e.currentTarget.value.length,
          e.currentTarget.value.length
        )
      }
      onKeyDown={(e) => {
        if (e.code === "Enter" || e.code === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          if (title === "") {
            setTitle("misorter");
          }
          if (data && data.label) {
            // only update title of the list if we've fetched and changed the title from the original
            if (listLabel && title !== oldTitle) {
              updateTitle.mutate({ label: data.label, title });
              setOldTitle(title);
            }
          }
          setEditTitle(false);
        }
      }}
    />
  );
};

export default ListTitleEdit;
