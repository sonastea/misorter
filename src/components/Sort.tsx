import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ListItem } from "src/pages";
import styles from "../styles/Sort.module.css";

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

const Sort = ({
  ogList,
  setStartSort,
}: {
  ogList: ListItem[];
  setStartSort: Function;
}) => {
  const [finishedSort, setFinishedSort] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const ref = useRef<HTMLTableElement>(null);

  const DownloadAsPng = dynamic(
    () => import("../components/DownloadAsPngButton"),
    {
      ssr: false,
    }
  );

  const copyLinkToClipboard = async () => {
    await navigator.clipboard.writeText(window.location.href).then(
      () => {
        toast.success("Successfully copied.");
      },
      () => {
        toast.warn("Unable to copy link.");
      }
    );
  };

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

    numQuestion++;
  }

  function toNameFace(n: any) {
    let str = ogList[n].value;
    return str;
  }

  useEffect(() => {
    initList();
    showSortable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ResultsItem = ({ ranking, item }: { ranking: number; item: any }) => {
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
    let resultsItems: any[] = [];

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
            <DownloadAsPng />
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
        <button
          aria-label="Share a direct link of this list"
          className={styles.shareContainer}
          type="button"
          title="Share a direct link of this list"
        >
          <svg
            className={styles.share}
            viewBox="0 0 24 24"
            onClick={() => copyLinkToClipboard()}
          >
            <path
              fill="currentColor"
              d="M10.59,13.41C11,13.8 11,14.44 10.59,14.83C10.2,15.22 9.56,15.22 9.17,14.83C7.22,12.88 7.22,9.71 9.17,7.76V7.76L12.71,4.22C14.66,2.27 17.83,2.27 19.78,4.22C21.73,6.17 21.73,9.34 19.78,11.29L18.29,12.78C18.3,11.96 18.17,11.14 17.89,10.36L18.36,9.88C19.54,8.71 19.54,6.81 18.36,5.64C17.19,4.46 15.29,4.46 14.12,5.64L10.59,9.17C9.41,10.34 9.41,12.24 10.59,13.41M13.41,9.17C13.8,8.78 14.44,8.78 14.83,9.17C16.78,11.12 16.78,14.29 14.83,16.24V16.24L11.29,19.78C9.34,21.73 6.17,21.73 4.22,19.78C2.27,17.83 2.27,14.66 4.22,12.71L5.71,11.22C5.7,12.04 5.83,12.86 6.11,13.65L5.64,14.12C4.46,15.29 4.46,17.19 5.64,18.36C6.81,19.54 8.71,19.54 9.88,18.36L13.41,14.83C14.59,13.66 14.59,11.76 13.41,10.59C13,10.2 13,9.56 13.41,9.17Z"
            />
          </svg>
        </button>
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
