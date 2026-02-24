import { List } from "@router/listing";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import ListItemsSkeletonLoader from "@/components/ListItemsSkeletonLoader";
import ListTitle from "@/components/ListTitle";
import ListTitleEdit from "@/components/ListTitleEdit";
import Setup from "@/components/Setup";
import Sort from "@/components/Sort";
import FeaturedLists from "@/components/FeaturedLists";
import FeaturedListsToggle from "@/components/FeaturedListsToggle";
import Footer from "@/components/Footer";
import NoticeBanner from "@/components/NoticeBanner";
import SupportForm from "@/components/SupportForm";
import { trpc } from "@utils/trpc";
import { v4 as uuidv4 } from "uuid";
import ThemeToggle from "@/components/ThemeToggle";

const tip =
  "Tap the title to name your list something.<br/>hitting <b>no opinion</b>  or  <b>I like both</b> frequently will negatively affect your results.";

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

  const focusTitleRef = useRef(false);

  // Featured Lists
  const [selectedList, setSelectedList] = useState<string>("");
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <ThemeToggle />
      <NoticeBanner />
      <SupportForm />
      <div className="home-container">
        <main className="home-main">
          {editTitle ? (
            <ListTitleEdit
              title={title}
              setTitle={setTitle}
              data={currentListData}
              listLabel={listLabel ?? ""}
              oldTitle={oldTitle}
              setOldTitle={setOldTitle}
              setEditTitle={setEditTitle}
            />
          ) : (
            <ListTitle
              title={title}
              setEditTitle={(val) => {
                if (val) focusTitleRef.current = true;
                setEditTitle(val);
              }}
              focusRef={focusTitleRef}
            />
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
    </>
  );
}
