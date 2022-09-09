import type { NextPage } from "next";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import ListItemsSkeletonLoader from "src/components/ListItemsSkeletonLoader";
import Setup from "src/components/Setup";
import Sort from "src/components/Sort";
import ThemeToggle from "src/components/ThemeToggle";
import { trpc } from "src/utils/trpc";
import { v4 as uuidv4 } from "uuid";
import styles from "../styles/Home.module.css";

const metaTitle = "misorter";
const metaDescription =
  "Sort list of items to create a ranking based on the results.";

const tip =
  "hitting 'no opinion' or 'I like both' frequently will negatively affect your results.";

const MIN_TEXTAREA_HEIGHT = 32;

export type ListItem = {
  id: string;
  value: string;
};

const Home: NextPage = () => {
  const [editTitle, setEditTitle] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("misorter");
  const [oldTitle, setOldTitle] = useState<string>();
  const [list, setList] = useState<ListItem[]>([]);
  const [newItem, setNewItem] = useState<string>("");
  const [startSort, setStartSort] = useState<boolean>(false);
  const [getListOnce, setGetListOnce] = useState<boolean>(false);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const router = useRouter();
  const listLabel = router.query["list"];

  const { data, isLoading, refetch } = trpc.useQuery(
    ["listing.get", { label: listLabel as string }],
    {
      refetchOnMount: false,
      refetchInterval: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      enabled: false,
    }
  );

  const DynamicFooter = dynamic(() => import("../components/Footer"), {
    ssr: false,
  });

  const updateTitle = trpc.useMutation(["listing.update-title"], {
    onSuccess: () => {
      toast.success("Successfully updated link to list.");
    },
    onError: () => {
      toast.error("Unable to update the list.");
    },
  });

  useEffect(() => {
    const backUrl = sessionStorage.getItem("back-url");
    if (router.query["code"] && router.query["state"]) {
      if (router.query["state"] === sessionStorage.getItem("state")) {
        sessionStorage.setItem(
          "twitch_auth_code",
          router.query["code"].toString()
        );
        sessionStorage.removeItem("state");
      }
      if (backUrl) {
        router.push(backUrl);
        sessionStorage.removeItem("back-url");
      }
    }
  }, [router, router.query]);

  useEffect(() => {
    if (listLabel && !getListOnce) {
      refetch();
      setGetListOnce(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listLabel]);

  useEffect(() => {
    data?.items.map((item: { value: string }) => {
      setList((prev: any) => [...prev, { id: uuidv4(), value: item.value }]);
    });
    if (data?.title) {
      setTitle(data?.title);
      setOldTitle(data?.title);
    }
  }, [data?.items, data?.title]);

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
    <div className={styles.container}>
      <Head>
        <title>{metaTitle}</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={metaDescription} />
        <meta
          name="keywords"
          content="sort, list, kpop, rank, ranking, tournament, sorter"
        />
        <meta name="twitter:creator" content="@teadroplets" />
        <meta name="og:title" content={metaTitle} />
        <meta name="og:description" content={metaDescription} />
      </Head>

      <ThemeToggle />
      <main className={styles.main}>
        {editTitle ? (
          <textarea
            className={styles.editTitle}
            value={title}
            ref={textAreaRef}
            onChange={(e: any) => {
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
                    updateTitle.mutate({ label: data.label, title });
                    setOldTitle(title);
                  }
                }
                setEditTitle(false);
              }
            }}
          />
        ) : (
          <div className={styles.titleContainer}>
            <span
              className={styles.title}
              onDoubleClick={() => setEditTitle(true)}
              title={title}
            >
              {title}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className={styles.editTitleButton}
              onClick={() => setEditTitle(true)}
            >
              <path
                fill="currentColor"
                d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"
              />
            </svg>
          </div>
        )}
        <p className={styles.description}>{tip}</p>

        {isLoading && <ListItemsSkeletonLoader />}

        {!isLoading && !startSort && (
          <Setup
            {...{
              label: data?.label,
              title,
              list,
              setList,
              getListOnce,
              setGetListOnce,
              newItem,
              setNewItem,
              setStartSort,
            }}
          />
        )}

        {startSort && <Sort ogList={list} setStartSort={setStartSort} />}
      </main>
      <DynamicFooter />
    </div>
  );
};

export default Home;
