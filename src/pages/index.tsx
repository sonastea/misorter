import type { NextPage } from "next";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import "react-toastify/dist/ReactToastify.min.css";
import ListItemsSkeletonLoader from "src/components/ListItemsSkeletonLoader";
import ListTitle from "src/components/ListTitle";
import ListTitleEdit from "src/components/ListTitleEdit";
import Setup from "src/components/Setup";
import Sort from "src/components/Sort";
import { trpc } from "src/utils/trpc";
import { v4 as uuidv4 } from "uuid";
import styles from "../styles/Home.module.css";

const metaTitle = "misorter";
const metaDescription =
  "Sort list of items to create a ranking based on the results. Sorter, Rankings, Favorites";

const tip =
  "hitting <b>no opinion</b>  or  <b>I like both</b> frequently will negatively affect your results.";

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
  const listLabel = router.query["list"] as string;

  const { data, isFetching, refetch } = trpc.listing.get.useQuery(
    { label: listLabel },
    {
      refetchOnMount: false,
      refetchInterval: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      enabled: false,
      trpc: {},
    }
  );

  const DynamicFooter = dynamic(() => import("../components/Footer"), {
    ssr: false,
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
    data?.items?.map((item: { value: string }) => {
      setList((prev: ListItem[]) => [
        ...prev,
        { id: uuidv4(), value: item.value },
      ]);
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
          content="sort, list, kpop, rank, ranking, tournament, sorter, song, movie, show, character"
        />
        <meta name="twitter:creator" content="@teadroplets" />
        <meta name="og:title" content={metaTitle} />
        <meta name="og:description" content={metaDescription} />
      </Head>

      <main className={styles.main}>
        {editTitle && data ? (
          <ListTitleEdit
            title={title}
            setTitle={setTitle}
            textAreaRef={textAreaRef}
            data={data}
            listLabel={listLabel}
            oldTitle={oldTitle}
            setOldTitle={setOldTitle}
            setEditTitle={setEditTitle}
          />
        ) : (
          <ListTitle title={title} setEditTitle={setEditTitle} />
        )}
        <p
          className={styles.description}
          dangerouslySetInnerHTML={{ __html: tip }}
        />

        {isFetching && <ListItemsSkeletonLoader />}

        {!isFetching && !startSort && (
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
