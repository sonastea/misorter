import { List } from "@router/listing";
import { useIsMutating, useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import ListItemsSkeletonLoader from "@/components/ListItemsSkeletonLoader";
import ListTitle from "@/components/ListTitle";
import ListTitleEdit from "@/components/ListTitleEdit";
import {
  rememberUsageTipsDismissal,
  usageTipsWereDismissed,
} from "@/components/UsageTips";
import Setup from "@/components/Setup";
import type { loadSort } from "@/utils/feature-loaders";
import FeaturedLists from "@/components/FeaturedLists";
import FeaturedListsToggle from "@/components/FeaturedListsToggle";
import Footer from "@/components/Footer";
import NoticeBanner from "@/components/NoticeBanner";
import SupportForm from "@/components/SupportForm";
import { trpc, queryClient } from "@utils/trpc";
import ThemeToggle from "@/components/ThemeToggle";
import {
  combineDrafts,
  importedItems,
  type ImportMode,
} from "@/utils/list-transfer/draft";
import { type ListDraft } from "@/utils/list-transfer/schema";

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
  const [sortModule, setSortModule] =
    useState<Awaited<ReturnType<typeof loadSort>>>();
  const Sort = sortModule?.default;
  const [getListOnce, setGetListOnce] = useState<boolean>(false);
  const [initialListSize, setInititalListSize] = useState<number>(-1);
  const [currentListData, setCurrentListData] = useState<Partial<List>>({});
  const detachedLabel = useRef<string | undefined>(undefined);
  const titleSaving =
    useIsMutating({
      mutationKey: trpc.listing.updateTitle.mutationOptions().mutationKey,
    }) > 0;

  const focusTitleRef = useRef(false);
  const titleRegionRef = useRef<HTMLDivElement>(null);
  const [tipsDismissed, setTipsDismissed] = useState(usageTipsWereDismissed);
  const [tipsReady, setTipsReady] = useState(false);
  // Only one automatic introduction per visit. Trending discovery can wait
  // until the next visit after the general tips have been dismissed.
  const [allowFeaturedDiscovery] = useState(tipsDismissed);
  const dismissUsageTips = useCallback(() => {
    rememberUsageTipsDismissal();
    setTipsDismissed(true);
  }, []);
  // Tracks which server label we've already applied to local state.
  // State (not a ref) so `enabled` below re-evaluates reactively.
  // Prevents refetch + re-apply when the data is already in hand
  // (e.g. just picked from featured lists).
  const [appliedLabel, setAppliedLabel] = useState<string | null>(null);

  // Featured Lists
  const [selectedList, setSelectedList] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [featuredRequested, setFeaturedRequested] = useState(false);
  const featured = useQuery({
    ...trpc.listing.getFeatured.queryOptions(),
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const featuredReady = featured.data !== undefined;

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

  const canShowUsageTips =
    !tipsDismissed &&
    !listLabel &&
    !currentListData.label &&
    !code &&
    !startSort &&
    !isFetching &&
    !editTitle &&
    !open &&
    list.length === 0 &&
    !newItem;

  useEffect(() => {
    if (!canShowUsageTips) return;
    const handleOutsideInteraction = (event: Event) => {
      if (
        event.target instanceof Node &&
        !titleRegionRef.current?.contains(event.target)
      ) {
        dismissUsageTips();
      }
    };
    const timer = window.setTimeout(() => setTipsReady(true), 1000);
    document.addEventListener("pointerdown", handleOutsideInteraction);
    document.addEventListener("focusin", handleOutsideInteraction);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", handleOutsideInteraction);
      document.removeEventListener("focusin", handleOutsideInteraction);
    };
  }, [canShowUsageTips, dismissUsageTips]);

  const toggleFeaturedLists = () => {
    dismissUsageTips();
    if (open) {
      setOpen(false);
      setFeaturedRequested(false);
    } else if (featuredReady) {
      setOpen(true);
    } else {
      setFeaturedRequested(true);
      if (!featured.isFetching) void featured.refetch();
    }
  };

  useEffect(() => {
    if (featuredRequested && featuredReady) {
      // Complete the user's pending open request once the query resolves.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
      setFeaturedRequested(false);
    }
  }, [featuredRequested, featuredReady]);

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
      detachedLabel.current = undefined;
      applyServerList(data, featured ? "FEATURED" : "URL");
    },
    [applyServerList]
  );

  const applyImportedList = (imported: ListDraft, mode: ImportMode) => {
    const result = combineDrafts(
      { title, items: list.map(({ value }) => ({ value })) },
      imported,
      mode
    );
    if (!result.success) return;
    // Block the old response immediately, before the router commits its search update.
    detachedLabel.current = listLabel;
    setList(importedItems(list, imported, mode));
    setTitle(result.draft.title);
    setOldTitle(result.draft.title);
    setNewItem("");
    setEditTitle(false);
    setStartSort(false);
    setGetListOnce(false);
    setInititalListSize(-1);
    setCurrentListData({});
    setAppliedLabel(null);
    setSelectedList("");
    void navigate({
      to: "/",
      search: (previous) => ({ ...previous, list: undefined }),
      replace: true,
    });
  };

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
    if (!listLabel) {
      detachedLabel.current = undefined;
      return;
    }
    if (
      !data?.label ||
      !data.items ||
      data.label !== listLabel ||
      detachedLabel.current === data.label
    )
      return;
    if (appliedLabel === data.label) return;
    // Intentional editable-copy sync: server data -> local list state, once per label.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyServerList(data as List, "URL");
  }, [data, listLabel, appliedLabel, applyServerList]);

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
              listLabel={currentListData.label ?? ""}
              oldTitle={oldTitle}
              setOldTitle={setOldTitle}
              setEditTitle={setEditTitle}
            />
          ) : (
            <ListTitle
              title={title}
              setEditTitle={(val) => {
                if (val) {
                  setOldTitle(title);
                  focusTitleRef.current = true;
                }
                setEditTitle(val);
              }}
              focusRef={focusTitleRef}
              containerRef={titleRegionRef}
              showTips={canShowUsageTips && tipsReady}
              onDismissTips={dismissUsageTips}
            />
          )}

          {isFetching && <ListItemsSkeletonLoader />}

          {!isFetching && !startSort && (
            <Setup
              onSortLoaded={setSortModule}
              onImport={applyImportedList}
              importDisabled={titleSaving}
              {...{
                label: currentListData.label,
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

          {startSort && Sort && (
            <Sort title={title} ogList={list} setStartSort={setStartSort} />
          )}
        </main>

        <FeaturedListsToggle
          toggleFeaturedLists={toggleFeaturedLists}
          open={open}
          loading={featuredRequested && featured.isFetching && !featuredReady}
          failed={featuredRequested && featured.isError && !featuredReady}
          showDiscovery={
            allowFeaturedDiscovery &&
            !!featured.data?.length &&
            !listLabel &&
            !code &&
            !startSort &&
            !isFetching &&
            !editTitle &&
            list.length === 0 &&
            !newItem
          }
        />

        <FeaturedLists
          data={featured.data}
          isLoading={featured.isLoading}
          isFetching={featured.isFetching}
          onRefresh={() => {
            void featured.refetch({ cancelRefetch: false });
          }}
          open={open}
          toggleOpen={toggleFeaturedLists}
          selectedList={selectedList}
          setSelectedList={setSelectedList}
          title="Trending Lists"
          updateList={updateList}
        />

        <Footer />
      </div>
    </>
  );
}
