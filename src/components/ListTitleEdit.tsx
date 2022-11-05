import { List } from "@router/listing";
import { ChangeEvent, RefObject } from "react";
import { toast } from "react-toastify";
import { trpc } from "src/utils/trpc";
import styles from "../styles/Home.module.css";

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
  textAreaRef: RefObject<HTMLTextAreaElement>;
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
      className={styles.editTitle}
      value={title}
      ref={textAreaRef}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
        setTitle(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.code === "Enter" || e.code === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          if (title === "") {
            setTitle("misorter");
          }
          if (data) {
            // only update title of the list if we've fetched and changed the title from the original
            if (listLabel && title !== oldTitle) {
              updateTitle.mutate({ label: data.label!, title });
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
