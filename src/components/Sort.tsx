import html2canvas from "html2canvas";
import { useEffect, useRef, useState } from "react";
import { ListItem } from "src/pages";
import styles from "../styles/Sort.module.css";

let lstMember = new Array();

const Sort = ({ ogList }: { ogList: ListItem[] }) => {
  const [showResults, setShowResults] = useState<boolean>(false);
  const ref = useRef<HTMLTableElement>(null);

  // Thanks to biasorter.tumblr.com for the code
  // https://biasorter.tumblr.com/
  //
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

      setShowResults(true);

      finishFlag = 1;
    } else {
      showImage();
    }
  }

  //Populate the boxes with items to compare
  function showImage() {
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
    showImage();
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
        <ResultsItem key={i} ranking={ranking} item={ogList[lstMember[0][i]].value} />
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
      <>
        <table id="ResultsTable" className={styles.resultsTable} ref={ref}>
          <tbody>
            <tr>
              <td className={styles.resultsHeader}>rank</td>
              <td className={styles.resultsHeader}>options</td>
            </tr>
            {resultsItems}
          </tbody>
        </table>
        <button
          className={styles.export}
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              exportToPng();
            }
          }}
        >
          Download as png
        </button>
      </>
    );
  };

  /* const exportToPng = () => {
    domtoimage
      .toJpeg(document.getElementById("ResultsTable") as HTMLElement, {
        quality: 0.95,
      })
      .then(function (dataUrl: string) {
        var link = document.createElement("a");
        link.download = `{misorter-results-${new Date(
          Date.now()
        ).toLocaleString()}.jpeg}`;
        link.href = dataUrl;
        link.click();
      });
  }; */

  /* const exportToPng = useCallback(() => {
    if (ref.current === null) {
      return;
    }

    toPng(ref.current, { cacheBust: true })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `misorter-results-${new Date(
          Date.now()
        ).toLocaleString()}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.log(err);
      });
  }, [ref]); */

  const exportToPng = () => {
    html2canvas(document.getElementById("ResultsTable") as HTMLElement).then(
      canvas => {
        let link = document.createElement("a");
        link.download = `misorter-results-${new Date(
          Date.now()
        ).toLocaleString()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    );
  };

  return (
    <>
      <div className={styles.container}>
        <div id="battleNumber" className={styles.gridHeader}>
          Battle #1
          <br />
          0% sorted.
        </div>
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

      {showResults === true ? <Results /> : null}
    </>
  );
};

export default Sort;
