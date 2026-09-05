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
import { trpc, queryClient } from "@utils/trpc";
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
  // Tracks which server label we've already applied to local state.
  // State (not a ref) so `enabled` below re-evaluates reactively.
  // Prevents refetch + re-apply when the data is already in hand
  // (e.g. just picked from featured lists).
  const [appliedLabel, setAppliedLabel] = useState<string | null>(null);

  // Featured Lists
  const [selectedList, setSelectedList] = useState<string>("");
  const [open, setOpen] = useState(false);

  const { data, isFetching } = useQuery({
    ...trpc.listing.get.queryOptions({ label: listLabel ?? "" }),
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: !!listLabel,
  });

  const createVisit = useMutation(trpc.listing.createVisit.mutationOptions());

  const toggleFeaturedLists = () => {
    setOpen((prev) => !prev);
  };

  // Single batched state update for a server-loaded list.
  // Replaces the old setList([]) + N× setList(prev => [...prev]) loop.
  // Also seeds the `listing.get` query cache synchronously, so the
  // subsequent navigate to ?list=<label> is a cache hit — no network fetch.
  // (Seeding is sync, unlike setState, so there's no race with navigate.)
  const applyServerList = useCallback(
    (serverData: List, source: "URL" | "FEATURED") => {
      const cacheValue: Partial<List> | null = {
        label: serverData.label,
        title: serverData.title,
        items: serverData.items.map((item) => ({ value: item.value })),
      };
      queryClient.setQueryData(
        trpc.listing.get.queryOptions({ label: serverData.label }).queryKey,
        cacheValue
      );
      setCurrentListData(serverData);
      setList(
        serverData.items.map((item) => ({
          id: crypto.randomUUID(),
          value: item.value,
        }))
      );
      setTitle(serverData.title);
      setOldTitle(serverData.title);
      setInititalListSize(serverData.items.length);
      setGetListOnce(true);
      setAppliedLabel(serverData.label);
      createVisit.mutate({ label: serverData.label, source });
    },
    [createVisit]
  );

  const updateList = useCallback(
    (data: List, featured: boolean) => {
      applyServerList(data, featured ? "FEATURED" : "URL");
    },
    [applyServerList]
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
    if (!data?.label || !data.items) return;
    if (appliedLabel === data.label) return;
    // Intentional editable-copy sync: server data -> local list state, once per label.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyServerList(data as List, "URL");
  }, [data, appliedLabel, applyServerList]);

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
