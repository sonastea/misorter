import {
  ReactElement,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from "react";
import { ListItem } from "src/routes/index";
import { deleteCookie, getCookie, setCookie } from "@utils/cookies";
import DownloadAsPngSkeleton from "./DownloadAsPngSkeleton";
import ConfirmModal from "./ConfirmModal";

const DownloadAsPng = lazy(() => import("../components/DownloadAsPngButton"));
const TwitchPollButton = lazy(
  () => import("../components/CreatePollButtonContainer")
);
const ShareLinkButton = lazy(() => import("../components/ShareLinkButton"));

const lstMember: number[][] = [];
const parent: number[] = [];
const equal: number[] = [];
const rec: number[] = [];

let cmp1: number, cmp2: number;
let head1: number, head2: number;
let nrec: number;
let numQuestion: number;
let totalSize: number;
let finishSize: number;
let finishFlag: number;
let clientId: string = "";
let clientSecret: string = "";

if (import.meta.env.VITE_CLIENT_ID) {
  clientId = import.meta.env.VITE_CLIENT_ID;
}

if (import.meta.env.VITE_CLIENT_SECRET) {
  clientSecret = import.meta.env.VITE_CLIENT_SECRET;
}

const Sort = ({
  ogList,
  setStartSort,
}: {
  ogList: ListItem[];
  setStartSort: (value: boolean) => void;
}) => {
  const [isLoggedIn, setLoggedIn] = useState<boolean>(false);
  const [finishedSort, setFinishedSort] = useState<boolean>(false);
  const [goBack, setGoBack] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [option1, setOption1] = useState<string>("");
  const [option2, setOption2] = useState<string>("");
  const ref = useRef<HTMLTableElement>(null);
  const currentListRef = useRef<ListItem[]>(ogList);

  let code: string | null = "";

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
          sameSite: "strict",
        });
        setLoggedIn(false);
      }
    } catch (error) {
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
                sameSite: "strict",
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

    // Clear previous state completely
    lstMember.length = 0;
    parent.length = 0;
    equal.length = 0;
    rec.length = 0;

    // The sequence that you should sort
    lstMember[n] = Array.from({ length: ogList.length }, (_, i) => i);
    parent[n] = -1;
    totalSize = 0;
    n++;

    for (let i = 0; i < lstMember.length; i++) {
      // And element divides it in two/more than two
      // Increase divided sequence of last in first member
      if (lstMember[i].length >= 2) {
        mid = Math.ceil(lstMember[i].length / 2);

        lstMember[n] = lstMember[i].slice(0, mid);
        totalSize += lstMember[n].length;
        parent[n] = i;
        n++;

        lstMember[n] = lstMember[i].slice(mid);
        totalSize += lstMember[n].length;
        parent[n] = i;
        n++;
      }
    }

    // Preserve this sequence
    rec.length = ogList.length;
    rec.fill(0);
    nrec = 0;

    // List that keeps your results
    // Value of link initial
    equal.length = ogList.length + 1;
    equal.fill(-1);

    cmp1 = lstMember.length - 2;
    cmp2 = lstMember.length - 1;
    head1 = 0;
    head2 = 0;
    numQuestion = 1;
    finishSize = 0;
    finishFlag = 0;
  }

  // Helper function to add element and its equal chain to rec
  function addToRecWithEquals(listIndex: number, headRef: { value: number }) {
    rec[nrec++] =
      listIndex === 1
        ? lstMember[cmp1][headRef.value++]
        : lstMember[cmp2][headRef.value++];
    finishSize++;

    while (equal[rec[nrec - 1]] !== -1) {
      rec[nrec++] =
        listIndex === 1
          ? lstMember[cmp1][headRef.value++]
          : lstMember[cmp2][headRef.value++];
      finishSize++;
    }
  }

  function sortList(flag: number) {
    const head1Ref = { value: head1 };
    const head2Ref = { value: head2 };

    // rec preservation
    if (flag < 0) {
      addToRecWithEquals(1, head1Ref);
    } else if (flag > 0) {
      addToRecWithEquals(2, head2Ref);
    } else {
      addToRecWithEquals(1, head1Ref);
      equal[rec[nrec - 1]] = lstMember[cmp2][head2Ref.value];
      addToRecWithEquals(2, head2Ref);
    }

    head1 = head1Ref.value;
    head2 = head2Ref.value;

    // Processing after finishing with one list
    if (head1 < lstMember[cmp1].length && head2 === lstMember[cmp2].length) {
      // List the remainder of cmp2 copies, list cmp1 copies when finished scanning
      while (head1 < lstMember[cmp1].length) {
        rec[nrec++] = lstMember[cmp1][head1++];
        finishSize++;
      }
    } else if (
      head1 === lstMember[cmp1].length &&
      head2 < lstMember[cmp2].length
    ) {
      // List the remainder of cmp1 copies, list cmp2 copies when finished scanning
      while (head2 < lstMember[cmp2].length) {
        rec[nrec++] = lstMember[cmp2][head2++];
        finishSize++;
      }
    }

    // When it arrives at the end of both lists
    // Update a pro list
    if (head1 === lstMember[cmp1].length && head2 === lstMember[cmp2].length) {
      const mergedLength = lstMember[cmp1].length + lstMember[cmp2].length;
      lstMember[parent[cmp1]] = rec.slice(0, mergedLength);

      lstMember.pop();
      lstMember.pop();

      cmp1 -= 2;
      cmp2 -= 2;
      head1 = 0;
      head2 = 0;

      // Initialize the rec before performing the new comparison
      rec.fill(0);
      nrec = 0;
    }

    if (cmp1 < 0) {
      const str =
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

  function toNameFace(n: number) {
    return ogList[n]?.value;
  }

  // Populate the boxes with items to compare
  function showSortable() {
    const str0 =
      "battle #" +
      numQuestion +
      "<br>" +
      Math.floor((finishSize * 100) / totalSize) +
      "% sorted.";

    const str1 = "" + toNameFace(lstMember[cmp1][head1]);
    const str2 = "" + toNameFace(lstMember[cmp2][head2]);

    document.getElementById("battleNumber")!.innerHTML = str0;
    document.getElementById("leftField")!.innerHTML = str1;
    document.getElementById("rightField")!.innerHTML = str2;

    setOption1(str1);
    setOption2(str2);

    numQuestion++;
  }

  useEffect(() => {
    // Update the ref to track current list
    currentListRef.current = ogList;

    // Reset UI state when list changes
    setFinishedSort(false);
    setShowResults(false);
    setOption1("");
    setOption2("");

    initList();
    showSortable();
    // We want this to run whenever ogList changes (new featured list selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ogList]);

  const ResultsItem = ({
    ranking,
    item,
  }: {
    ranking: number;
    item: string;
  }) => {
    return (
      <tr className="sort-itemRow">
        <td className="sort-leftItemRow">{ranking}</td>
        <td className="sort-rightItemRow">{item}</td>
      </tr>
    );
  };

  const Results = () => {
    let ranking: number = 1;
    let sameRank: number = 1;
    const resultsItems: ReactElement<typeof ResultsItem>[] = [];

    // Safety check: ensure data is valid and consistent
    // lstMember[0] should exist, have the right length, and all indices should be valid
    if (
      !lstMember[0] ||
      lstMember[0].length !== ogList.length ||
      !finishedSort ||
      ogList !== currentListRef.current
    ) {
      return null;
    }

    for (let i = 0; i < ogList.length; i++) {
      const itemIndex = lstMember[0][i];

      // Safety check: ensure the index is valid
      if (itemIndex === undefined || itemIndex >= ogList.length) {
        console.error(`Invalid index ${itemIndex} at position ${i}`);
        return null;
      }

      const item = ogList[itemIndex];

      // Safety check: ensure the item exists
      if (!item) {
        console.error(`Item not found at index ${itemIndex}`);
        return null;
      }

      resultsItems.push(
        <ResultsItem key={i} ranking={ranking} item={item.value} />
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
      <div className="sort-resultsContainer">
        {finishedSort && (
          <button
            className="sort-toggleResults"
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
            <div id="ResultsContainer" className="sort-resultsContainer">
              <table id="ResultsTable" className="sort-resultsTable" ref={ref}>
                <thead className="sort-resultsHeaderContainer">
                  <tr>
                    <th className="sort-resultsHeader">rank</th>
                    <th className="sort-resultsHeader">options</th>
                  </tr>
                </thead>
                <tbody>{resultsItems}</tbody>
              </table>
            </div>
            <Suspense fallback={<DownloadAsPngSkeleton />}>
              <DownloadAsPng />
            </Suspense>
          </>
        )}
      </div>
    );
  };

  const goBackConfirmation = () => {
    setGoBack(true);
  };

  return (
    <>
      <div className="sort-container">
        {goBack && (
          <ConfirmModal
            title="Would you like to return and edit the current list, or create a new one?"
            message="Any battles done will be lost."
            onCancel={() => setGoBack(false)}
            onConfirm={() => setStartSort(false)}
            open={goBack}
          />
        )}
        <button
          className="sort-back"
          type="button"
          onClick={goBackConfirmation}
          title="Back to the list"
        >
          ← Back
        </button>
        <div id="battleNumber" className="sort-gridHeader">
          Battle #1
          <br />
          0% sorted.
        </div>
        <Suspense fallback={<div />}>
          <TwitchPollButton
            isLoggedIn={isLoggedIn}
            option1={option1}
            option2={option2}
          />
        </Suspense>
        <Suspense fallback={<div />}>
          <ShareLinkButton />
        </Suspense>
        <div
          className="sort-leftField"
          onClick={() => {
            if (finishFlag === 0) {
              sortList(-1);
            }
          }}
        >
          <div id="leftField"></div>
        </div>
        <div
          className="sort-both middleField"
          onClick={() => {
            if (finishFlag === 0) {
              sortList(0);
            }
          }}
        >
          I like both
        </div>
        <div
          className="sort-rightField"
          onClick={() => {
            if (finishFlag === 0) {
              sortList(1);
            }
          }}
        >
          <div id="rightField"></div>
        </div>
        <div
          className="sort-noOpinion middleField"
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
