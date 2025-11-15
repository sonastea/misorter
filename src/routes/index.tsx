import { List } from "@router/listing";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import ListItemsSkeletonLoader from "src/components/ListItemsSkeletonLoader";
import ListTitle from "src/components/ListTitle";
import ListTitleEdit from "src/components/ListTitleEdit";
import Setup from "src/components/Setup";
import Sort from "src/components/Sort";
import FeaturedLists from "src/components/FeaturedLists";
import FeaturedListsToggle from "src/components/FeaturedListsToggle";
import Footer from "src/components/Footer";
import { trpc } from "@utils/trpc";
import { v4 as uuidv4 } from "uuid";

const tip =
  "hitting <b>no opinion</b>  or  <b>I like both</b> frequently will negatively affect your results.";

const MIN_TEXTAREA_HEIGHT = 32;

export type ListItem = {
  id: string;
  value: string;
};

type IndexSearch = {
  list?: string;
  code?: string;
  state?: string;
};

export const Route = createFileRoute("/")({
  component: Home,
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    list: search.list as string | undefined,
    code: search.code as string | undefined,
    state: search.state as string | undefined,
  }),
});

function Home() {
  const { list: listLabel, code, state } = Route.useSearch();
  const navigate = useNavigate();

  const [editTitle, setEditTitle] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("misorter");
  const [oldTitle, setOldTitle] = useState<string>();
  const [list, setList] = useState<ListItem[]>([]);
  const [newItem, setNewItem] = useState<string>("");
  const [startSort, setStartSort] = useState<boolean>(false);
  const [getListOnce, setGetListOnce] = useState<boolean>(false);
  const [initialListSize, setInititalListSize] = useState<number>(-1);
  const [currentListData, setCurrentListData] = useState<Partial<List>>({});

  // Featured Lists
  const [selectedList, setSelectedList] = useState<string>("");
  const [open, setOpen] = useState(false);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const { data, isFetching, refetch } = useQuery({
    ...trpc.listing.get.queryOptions({ label: listLabel ?? "" }),
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: false,
  });

  const createVisit = useMutation(trpc.listing.createVisit.mutationOptions());

  const toggleFeaturedLists = () => {
    setOpen(!open);
  };

  const updateList = useCallback(
    (data: List, featured: boolean, fromUrl: boolean) => {
      if (featured) {
        // if we picked a featured list, add a visit to the db
        createVisit.mutate({ label: data.label, source: "FEATURED" });
        setGetListOnce(true);
      } else if (fromUrl) {
        // if we loaded a list from URL, add a URL visit to the db
        createVisit.mutate({ label: data.label, source: "URL" });
      }

      // Store the current list data so it's available for title editing
      setCurrentListData(data);

      setList([]);
      setInititalListSize(data.items?.length);
      data.items.map((item) => {
        setList((prev) => [...prev, { id: uuidv4(), value: item.value }]);
      });
      setTitle(data.title);
      setOldTitle(data.title);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const backUrl = sessionStorage.getItem("back-url");
    if (code && state) {
      if (state === sessionStorage.getItem("state")) {
        sessionStorage.setItem("twitch_auth_code", code.toString());
        sessionStorage.removeItem("state");
      }
      if (backUrl) {
        navigate({ to: backUrl });
        sessionStorage.removeItem("back-url");
      }
    }
  }, [code, state, navigate]);

  useEffect(() => {
    if (listLabel && !getListOnce) {
      refetch();
      setGetListOnce(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listLabel, refetch]);

  useEffect(() => {
    if (data && data.items) {
      setInititalListSize(data.items.length);
      updateList(data as List, false, true);
    }
  }, [data, data?.items, data?.title, updateList]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "inherit";
      textAreaRef.current.style.height = `${Math.max(
        textAreaRef.current.scrollHeight,
        MIN_TEXTAREA_HEIGHT
      )}px`;
    }
  }, [title]);

  return (
    <div className="home-container">
      <main className="home-main">
        {editTitle ? (
          <ListTitleEdit
            title={title}
            setTitle={setTitle}
            textAreaRef={textAreaRef}
            data={currentListData}
            listLabel={listLabel ?? ""}
            oldTitle={oldTitle}
            setOldTitle={setOldTitle}
            setEditTitle={setEditTitle}
          />
        ) : (
          <ListTitle title={title} setEditTitle={setEditTitle} />
        )}
        <div className="home-tipContainer">
          <p className="home-tip" dangerouslySetInnerHTML={{ __html: tip }} />
        </div>

        {isFetching && <ListItemsSkeletonLoader />}

        {!isFetching && !startSort && (
          <Setup
            {...{
              label: data?.label,
              title,
              initialListSize,
              list,
              setList,
              getListOnce,
              setGetListOnce,
              newItem,
              setEditTitle,
              setNewItem,
              setStartSort,
            }}
          />
        )}

        {startSort && <Sort ogList={list} setStartSort={setStartSort} />}
      </main>

      <FeaturedListsToggle toggleFeaturedLists={toggleFeaturedLists} />

      <FeaturedLists
        open={open}
        toggleOpen={toggleFeaturedLists}
        selectedList={selectedList}
        setSelectedList={setSelectedList}
        title="Featured Lists"
        updateList={updateList}
      />

      <Footer />
    </div>
  );
}
