import type { NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import Footer from "src/components/Footer";
import Setup from "src/components/Setup";
import Sort from "src/components/Sort";
import styles from "../styles/Home.module.css";

const tip =
  "hitting 'no opinion' or 'I like both' frequently will negatively affect your results.";

export type ListItem = {
  id: string;
  value: string;
}

const Home: NextPage = () => {
  const [editTitle, setEditTitle] = useState<boolean>(true);
  const [title, setTitle] = useState<string>("misorter");
  const [list, setList] = useState<ListItem[]>([]);
  const [newItem, setNewItem] = useState<string>("");
  const [startSort, setStartSort] = useState<boolean>(false);

  return (
    <div className={styles.container}>
      <Head>
        <title>misorter</title>
        <meta
          name="Sort and create a rank your favorites in a list"
          content="misorter"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

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

        {startSort ? (
          <Sort ogList={list} setStartSort={setStartSort} />
        ) : (
          <Setup {...{ list, setList, newItem, setNewItem, setStartSort }} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Home;
