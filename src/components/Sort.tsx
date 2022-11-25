import { deleteCookie, getCookie, setCookie } from "cookies-next";
import dynamic from "next/dynamic";
import { ReactElement, Suspense, useEffect, useRef, useState } from "react";
import { ListItem } from "src/pages";
import styles from "../styles/Sort.module.css";
import DownloadAsPngSkeleton from "./DownloadAsPngSkeleton";

let lstMember = new Array();
let parent = new Array();
let equal = new Array();
let rec = new Array();

let cmp1: number, cmp2: number;
let head1: number, head2: number;
let nrec: number;
let numQuestion: number;
let totalSize: number;
let finishSize: number;
let finishFlag: number;
let clientId: string = "";
let clientSecret: string = "";

if (process.env.NEXT_PUBLIC_clientId) {
  clientId = process.env.NEXT_PUBLIC_clientId;
}

if (process.env.NEXT_PUBLIC_clientSecret) {
  clientSecret = process.env.NEXT_PUBLIC_clientSecret;
}

const Sort = ({
  ogList,
  setStartSort,
}: {
  ogList: ListItem[];
  setStartSort: Function;
}) => {
  const [isLoggedIn, setLoggedIn] = useState<boolean>(false);
  const [finishedSort, setFinishedSort] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [option1, setOption1] = useState<string>("");
  const [option2, setOption2] = useState<string>("");
  const ref = useRef<HTMLTableElement>(null);

  let code: string | null = "";

  const DownloadAsPng = dynamic(
    () => import("../components/DownloadAsPngButton"),
    {
      ssr: false,
    }
  );

  const TwitchPollButton = dynamic(
    () => import("../components/CreatePollButtonContainer"),
    {
      ssr: false,
    }
  );

  const ShareLinkButton = dynamic(
    () => import("../components/ShareLinkButton"),
    {
      ssr: false,
    }
  );

  const validate = async () => {
    try {
      const data = await fetch("https://id.twitch.tv/oauth2/validate", {
        method: "GET",
        headers: {
          Authorization: `${getCookie("Authorization")}`,
        },
      }).then((res) => res.json());
      if (data && data.user_id) {
        sessionStorage.setItem("twitch_user_id", data.user_id);
        setLoggedIn(true);
      } else if (data.status === 401) {
        deleteCookie("Authorization", {
          secure: true,
          sameSite: true,
        });
        setLoggedIn(false);
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!isLoggedIn && !sessionStorage.getItem("twitch_auth_code")) {
      validate();
    }
  }, [isLoggedIn]);

  if (typeof window !== "undefined" && sessionStorage) {
    code = sessionStorage.getItem("twitch_auth_code");
  }

  useEffect(() => {
    const getAccessToken = async () => {
      try {
        const data = await fetch("https://id.twitch.tv/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code: code as string,
            grant_type: "authorization_code",
            redirect_uri: window.location.origin,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.access_token) {
              setCookie("Authorization", `Bearer ${data.access_token}`, {
                secure: true,
                sameSite: true,
              });
              sessionStorage.removeItem("twitch_auth_code");
              setLoggedIn(true);
              validate();
            }
          });
        return data;
      } catch (error) {
        console.error(error);
      }
    };

    if (code && !isLoggedIn) {
      getAccessToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Thanks to biasorter.tumblr.com for the code
  // https://biasorter.tumblr.com/
  function initList() {
    let n = 0;
    let mid;
    let i;

    //The sequence that you should sort
    lstMember[n] = new Array();

    for (i = 0; i < ogList.length; i++) {
      lstMember[n][i] = i;
    }

    parent[n] = -1;

    totalSize = 0;

    n++;

    for (i = 0; i < lstMember.length; i++) {
      //And element divides it in two/more than two
      //Increase divided sequence of last in first member
      if (lstMember[i].length >= 2) {
        mid = Math.ceil(lstMember[i].length / 2);

        lstMember[n] = new Array();

        lstMember[n] = lstMember[i].slice(0, mid);

        totalSize += lstMember[n].length;

        parent[n] = i;

        n++;

        lstMember[n] = new Array();

        lstMember[n] = lstMember[i].slice(mid, lstMember[i].length);

        totalSize += lstMember[n].length;

        parent[n] = i;

        n++;
      }
    }

    //Preserve this sequence
    for (i = 0; i < ogList.length; i++) {
      rec[i] = 0;
    }

    nrec = 0;

    //List that keeps your results
    // Value of link initial
    for (i = 0; i <= ogList.length; i++) {
      equal[i] = -1;
    }

    cmp1 = lstMember.length - 2;

    cmp2 = lstMember.length - 1;

    head1 = 0;

    head2 = 0;

    numQuestion = 1;

    finishSize = 0;

    finishFlag = 0;
  }

  function sortList(flag: number) {
    let i;
    let str;

    //rec preservation
    if (flag < 0) {
      rec[nrec] = lstMember[cmp1][head1];

      head1++;

      nrec++;

      finishSize++;

      while (equal[rec[nrec - 1]] !== -1) {
        rec[nrec] = lstMember[cmp1][head1];

        head1++;

        nrec++;

        finishSize++;
      }
    } else if (flag > 0) {
      rec[nrec] = lstMember[cmp2][head2];

      head2++;

      nrec++;

      finishSize++;

      while (equal[rec[nrec - 1]] !== -1) {
        rec[nrec] = lstMember[cmp2][head2];

        head2++;

        nrec++;

        finishSize++;
      }
    } else {
      rec[nrec] = lstMember[cmp1][head1];

      head1++;

      nrec++;

      finishSize++;

      while (equal[rec[nrec - 1]] !== -1) {
        rec[nrec] = lstMember[cmp1][head1];

        head1++;

        nrec++;

        finishSize++;
      }

      equal[rec[nrec - 1]] = lstMember[cmp2][head2];

      rec[nrec] = lstMember[cmp2][head2];

      head2++;

      nrec++;

      finishSize++;

      while (equal[rec[nrec - 1]] !== -1) {
        rec[nrec] = lstMember[cmp2][head2];

        head2++;

        nrec++;

        finishSize++;
      }
    }

    //Processing after finishing with one list
    if (head1 < lstMember[cmp1].length && head2 === lstMember[cmp2].length) {
      //List the remainder of cmp2 copies, list cmp1 copies when finished scanning
      while (head1 < lstMember[cmp1].length) {
        rec[nrec] = lstMember[cmp1][head1];

        head1++;

        nrec++;

        finishSize++;
      }
    } else if (
      head1 === lstMember[cmp1].length &&
      head2 < lstMember[cmp2].length
    ) {
      //List the remainder of cmp1 copies, list cmp2 copies when finished scanning
      while (head2 < lstMember[cmp2].length) {
        rec[nrec] = lstMember[cmp2][head2];

        head2++;

        nrec++;

        finishSize++;
      }
    }

    //When it arrives at the end of both lists
    //Update a pro list
    if (head1 === lstMember[cmp1].length && head2 === lstMember[cmp2].length) {
      for (i = 0; i < lstMember[cmp1].length + lstMember[cmp2].length; i++) {
        lstMember[parent[cmp1]][i] = rec[i];
      }

      lstMember.pop();

      lstMember.pop();

      cmp1 = cmp1 - 2;

      cmp2 = cmp2 - 2;

      head1 = 0;

      head2 = 0;

      //Initialize the rec before performing the new comparison
      if (head1 === 0 && head2 === 0) {
        for (i = 0; i < ogList.length; i++) {
          rec[i] = 0;
        }

        nrec = 0;
      }
    }

    if (cmp1 < 0) {
      str =
        "battle #" +
        (numQuestion - 1) +
        "<br>" +
        Math.floor((finishSize * 100) / totalSize) +
        "% sorted.";

      document.getElementById("battleNumber")!.innerHTML = str;

      setFinishedSort(true);

      finishFlag = 1;
    } else {
      showSortable();
    }
  }

  //Populate the boxes with items to compare
  function showSortable() {
    let str0 =
      "battle #" +
      numQuestion +
      "<br>" +
      Math.floor((finishSize * 100) / totalSize) +
      "% sorted.";

    let str1 = "" + toNameFace(lstMember[cmp1][head1]);
    let str2 = "" + toNameFace(lstMember[cmp2][head2]);

    document.getElementById("battleNumber")!.innerHTML = str0;
    document.getElementById("leftField")!.innerHTML = str1;
    document.getElementById("rightField")!.innerHTML = str2;

    setOption1(str1);
    setOption2(str2);

    numQuestion++;
  }

  function toNameFace(n: number) {
    let str = ogList[n].value;
    return str;
  }

  useEffect(() => {
    initList();
    showSortable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ResultsItem = ({
    ranking,
    item,
  }: {
    ranking: number;
    item: string;
  }) => {
    return (
      <tr className={styles.itemRow}>
        <td className={styles.leftItemRow}>{ranking}</td>
        <td className={styles.rightItemRow}>{item}</td>
      </tr>
    );
  };

  const Results = () => {
    let ranking: number = 1;
    let sameRank: number = 1;
    let resultsItems: ReactElement<typeof ResultsItem>[] = [];

    for (let i = 0; i < ogList.length; i++) {
      resultsItems.push(
        <ResultsItem
          key={i}
          ranking={ranking}
          item={ogList[lstMember[0][i]].value}
        />
      );

      if (i < ogList.length - 1) {
        if (equal[lstMember[0][i]] == lstMember[0][i + 1]) {
          sameRank++;
        } else {
          ranking += sameRank;
          sameRank = 1;
        }
      }
    }

    return (
      <div className={styles.resultsContainer}>
        {finishedSort && (
          <button
            className={styles.toggleResults}
            type="button"
            onClick={() => {
              setShowResults((prev) => !prev);
            }}
          >
            {showResults ? "Collapse results" : "Show results"}
          </button>
        )}
        {showResults && (
          <>
            <table id="ResultsTable" className={styles.resultsTable} ref={ref}>
              <thead className={styles.resultsHeaderContainer}>
                <tr>
                  <th className={styles.resultsHeader}>rank</th>
                  <th className={styles.resultsHeader}>options</th>
                </tr>
              </thead>
              <tbody>{resultsItems}</tbody>
            </table>
            <Suspense fallback={<DownloadAsPngSkeleton />}>
              <DownloadAsPng />
            </Suspense>
          </>
        )}
      </div>
    );
  };

  const goBackConfirmation = () => {
    if (confirm("Are you sure you want to go back?") === true) {
      setStartSort(false);
    }
    return;
  };

  return (
    <>
      <div className={styles.container}>
        <button
          className={styles.back}
          type="button"
          onClick={() => goBackConfirmation()}
          title="Back to the list"
        >
          ← Back
        </button>
        <div id="battleNumber" className={styles.gridHeader}>
          Battle #1
          <br />
          0% sorted.
        </div>
        <TwitchPollButton
          isLoggedIn={isLoggedIn}
          option1={option1}
          option2={option2}
        />
        <ShareLinkButton />
        <div
          className={styles.leftField}
          onClick={() => {
            if (finishFlag === 0) {
              sortList(-1);
            }
          }}
        >
          <div id="leftField"></div>
        </div>
        <div
          className={`${styles.both} middleField`}
          onClick={() => {
            if (finishFlag === 0) {
              sortList(0);
            }
          }}
        >
          I like both
        </div>
        <div
          className={styles.rightField}
          onClick={() => {
            if (finishFlag === 0) {
              sortList(1);
            }
          }}
        >
          <div id="rightField"></div>
        </div>
        <div
          className={`${styles.noOpinion} middleField`}
          onClick={() => {
            if (finishFlag === 0) {
              sortList(0);
            }
          }}
        >
          no opinion
        </div>
      </div>

      {finishedSort && <Results />}
    </>
  );
};

export default Sort;
