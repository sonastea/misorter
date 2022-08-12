import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import "react-toastify/dist/ReactToastify.min.css";
import Footer from "src/components/Footer";
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

export type ListItem = {
  id: string;
  value: string;
};

const Home: NextPage = () => {
  const [editTitle, setEditTitle] = useState<boolean>(true);
  const [title, setTitle] = useState<string>("misorter");
  const [list, setList] = useState<ListItem[]>([]);
  const [newItem, setNewItem] = useState<string>("");
  const [startSort, setStartSort] = useState<boolean>(false);
  const [getListOnce, setGetListOnce] = useState<boolean>(false);

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

  useEffect(() => {
    if (listLabel && !getListOnce) {
      refetch();
      setGetListOnce(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listLabel]);

  useEffect(() => {
    data?.items.map((item) => {
      setList((prev: any) => [{ id: uuidv4(), value: item.value }, ...prev]);
    });
  }, [data?.items]);

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
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ThemeToggle />
      <main className={styles.main}>
        {editTitle ? (
          <h1
            className={styles.title}
            onDoubleClick={() => setEditTitle(false)}
          >
            {title}
          </h1>
        ) : (
          <input
            className={styles.editTitle}
            type="text"
            value={title}
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
                setEditTitle(true);
              }
            }}
          />
        )}
        <p className={styles.description}>{tip}</p>

        {isLoading && <ListItemsSkeletonLoader />}

        {startSort ? (
          <Sort ogList={list} setStartSort={setStartSort} />
        ) : (
          <Setup
            {...{
              list,
              setList,
              setGetListOnce,
              newItem,
              setNewItem,
              setStartSort,
            }}
          />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Home;
