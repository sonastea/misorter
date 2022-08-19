import Image from "next/image";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { ListItem } from "src/pages";
import { trpc } from "src/utils/trpc";
import { v4 as uuidv4 } from "uuid";
import styles from "../styles/Home.module.css";

interface SetupProps {
  title: string;
  list: ListItem[];
  setList: Function;
  getListOnce: boolean;
  setGetListOnce: Function;
  newItem: string;
  setNewItem: Function;
  setStartSort: Function;
}

const Setup = ({
  title,
  list,
  setList,
  getListOnce,
  setGetListOnce,
  newItem,
  setNewItem,
  setStartSort,
}: SetupProps) => {
  const router = useRouter();

  const createList = trpc.useMutation(["listing.create"], {
    onSuccess: (data) => {
      router.push(`/?list=${data.label}`, undefined, { shallow: true });
      setGetListOnce(true);
      setStartSort(true);
      toast.success("Successfully created link to list.");
    },
    onError: () => {
      setStartSort(true);
      toast.error("Unable to create link to list.");
    },
  });

  const checkList = async () => {
    if (list.length < 2) {
      toast.warn("Not enough items in the list.");
      return;
    }

    const sanitizedList = list.map((item) => {
      return { value: item.value };
    });

    // don't create a Listing if we've already fetched one
    if (!getListOnce) {
      createList.mutate({ title: title, items: sanitizedList });
    } else {
      // start sort if we've fetched a listing
      setStartSort(true);
    }
  };

  const resetList = () => {
    setList([]);
  };

  const addItemToList = () => {
    setList((prev: any) => [{ id: uuidv4(), value: newItem }, ...prev]);
    setNewItem("");
    // try resetting getListOnce assuming new items considers it a different list
    setGetListOnce(false);
  };

  const creatingList = createList.isLoading;

  return (
    <>
      <div className={styles.inputContainer}>
        <input
          className={styles.listInput}
          type="text"
          placeholder="Add an item to the list"
          value={newItem}
          onChange={(e: any) => {
            setNewItem(e.target.value);
          }}
          onKeyDown={(e: any) => {
            if (e.code === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              addItemToList();
            }
          }}
        />
        <button
          aria-label="Add item to the list"
          className={styles.inputButton}
          onClick={() => addItemToList()}
          type="button"
        >
          <svg className={styles.inputButtonIcon} viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"
            />
          </svg>
        </button>
      </div>
      <ul className={styles.listTable}>
        {list &&
          list.map((item: ListItem) => {
            return (
              <li className={styles.item} key={item.id}>
                <p
                  contentEditable="true"
                  suppressContentEditableWarning={true}
                  onKeyDown={(e: any) => {
                    if (e.code === "Enter" || e.code === "Escape") {
                      e.preventDefault();
                      e.target.blur();
                    }
                    item.value = e.target.textContent;
                    // editting a list field indicates a new item
                    setGetListOnce(false);
                  }}
                >
                  {item.value}
                </p>
                <svg
                  className={styles.removeItem}
                  style={{ width: "1.75em", height: "1.75em" }}
                  viewBox="0 0 24 24"
                  onClick={(e) => {
                    e.currentTarget.parentElement?.classList.add(
                      styles.removing
                    );
                    setTimeout(() => {
                      setList(list.filter((it) => it !== item));
                    }, 200);
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
      <div className={styles.listButtons}>
        <button className={styles.reset} onClick={resetList}>
          Reset
        </button>
        <button className={styles.start} onClick={checkList}>
          {creatingList ? (
            <Image
              src="/images/oval.svg"
              height={24}
              width={24}
              alt="Loading"
            />
          ) : (
            "Start"
          )}
        </button>
      </div>
    </>
  );
};

export default Setup;
