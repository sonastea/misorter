import Image from "next/image";
import { useRouter } from "next/router";
import { ChangeEvent, KeyboardEvent } from "react";
import { toast } from "react-toastify";
import { ListItem } from "src/pages";
import { trpc } from "src/utils/trpc";
import { v4 as uuidv4 } from "uuid";

interface SetupProps {
  title: string;
  list: ListItem[];
  initialListSize: number;
  setList: (x: string) => void;
  getListOnce: boolean;
  setGetListOnce: (x: boolean) => void;
  newItem: string;
  setEditTitle: (x: boolean) => void;
  setNewItem: (x: string) => void;
  setStartSort: (x: boolean) => void;
}

const Setup = ({
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
  const router = useRouter();

  const createList = trpc.listing.create.useMutation({
    onSuccess: (data: { label: string }) => {
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

    // fetched a list and it's the same list
    if (getListOnce && initialListSize === list.length) {
      setStartSort(true);
    } else {
      createList.mutate({ title: title, items: sanitizedList });
    }

    window.scrollTo({ top: 0 });
  };

  const resetList = () => {
    setEditTitle(false);
    setList([]);
  };

  const addItemToList = () => {
    setList((prev: ListItem[]) => [{ id: uuidv4(), value: newItem }, ...prev]);
    setNewItem("");
    // try resetting getListOnce assuming new items considers it a different list
    setGetListOnce(false);
  };

  const creatingList = createList.isPending;

  return (
    <>
      <div className="home-inputContainer">
        <input
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
      <ul className="home-listTable">
        {list &&
          list.map((item: ListItem) => {
            return (
              <li className="home-item" key={item.id}>
                <p
                  contentEditable="true"
                  suppressContentEditableWarning={true}
                  onKeyDown={(e: KeyboardEvent<HTMLParagraphElement>) => {
                    if (e.code === "Enter" || e.code === "Escape") {
                      e.preventDefault();
                      (e.target as HTMLElement).blur();
                    }
                    item.value =
                      (e.target as HTMLParagraphElement).textContent ?? "";
                    // editting a list field indicates a new item
                    setGetListOnce(false);
                  }}
                >
                  {item.value}
                </p>
                <svg
                  className="home-removeItem"
                  style={{ width: "1.75em", height: "1.75em" }}
                  viewBox="0 0 24 24"
                  onClick={(e) => {
                    e.currentTarget.parentElement?.classList.add(
                      "home-removing"
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
      <div className="home-listButtons">
        <button className="home-reset" onClick={resetList}>
          Reset
        </button>
        <button className="home-start" onClick={checkList}>
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
