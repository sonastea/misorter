import {
  ReactElement,
  RefObject,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ListItem } from "src/routes/index";
import { deleteCookie, getCookie, setCookie } from "@utils/cookies";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import DownloadAsPngSkeleton from "./DownloadAsPngSkeleton";
import ConfirmModal from "./ConfirmModal";

const DownloadAsPng = lazy(() => import("../components/DownloadAsPngButton"));
const TwitchPollButton = lazy(
  () => import("../components/CreatePollButtonContainer")
);
const ShareLinkButton = lazy(() => import("../components/ShareLinkButton"));

type SortEngine = {
  lstMember: number[][];
  parent: number[];
  equal: number[];
  rec: number[];
  cmp1: number;
  cmp2: number;
  head1: number;
  head2: number;
  nrec: number;
  numQuestion: number;
  totalSize: number;
  finishSize: number;
  finishFlag: number;
};

const createSortEngine = (): SortEngine => {
  return {
    lstMember: [],
    parent: [],
    equal: [],
    rec: [],
    cmp1: 0,
    cmp2: 0,
    head1: 0,
    head2: 0,
    nrec: 0,
    numQuestion: 0,
    totalSize: 0,
    finishSize: 0,
    finishFlag: 0,
  };
};

const Sort = ({
  ogList,
  setStartSort,
}: {
  ogList: ListItem[];
  setStartSort: (value: boolean) => void;
}) => {
  const [isLoggedIn, setLoggedIn] = useState<boolean>(false);
  // Reset sort state on list replacement without remounting authentication.
  const [session, setSession] = useState({ list: ogList, version: 0 });
  if (session.list !== ogList) {
    setSession({ list: ogList, version: session.version + 1 });
  }

  let code: string | null = "";

  const validate = useCallback(async () => {
    try {
      const data = await fetch("https://id.twitch.tv/oauth2/validate", {
        method: "GET",
        headers: {
          Authorization: `${getCookie("Authorization")}`,
        },
      }).then((res) => res.json());
      if (data && data.user_id) {
        sessionStorage.setItem("twitch_user_id", data.user_id);
        return true;
      } else if (data.status === 401) {
        deleteCookie("Authorization", {
          secure: true,
          sameSite: "strict",
        });
        return false;
      }
    } catch (error) {
      console.error(error);
    }
    return null;
  }, []);

  useEffect(() => {
    if (!isLoggedIn && !sessionStorage.getItem("twitch_auth_code")) {
      let active = true;
      void validate().then((loggedIn) => {
        if (active && loggedIn !== null) setLoggedIn(loggedIn);
      });
      return () => {
        active = false;
      };
    }
  }, [isLoggedIn, validate]);

  if (typeof window !== "undefined" && sessionStorage) {
    code = sessionStorage.getItem("twitch_auth_code");
  }

  const exchangeCode = useMutation(
    trpc.twitch.exchangeCode.mutationOptions({
      onSuccess: (data) => {
        setCookie("Authorization", `Bearer ${data.accessToken}`, {
          secure: true,
          sameSite: "strict",
        });
        sessionStorage.removeItem("twitch_auth_code");
        setLoggedIn(true);
        void validate().then((loggedIn) => {
          if (loggedIn !== null) setLoggedIn(loggedIn);
        });
      },
      onError: (error) => {
        console.error(error);
      },
    })
  );

  useEffect(() => {
    // Secret stays server-side: the Worker exchanges the code with Twitch.
    if (code && !isLoggedIn) {
      exchangeCode.mutate({
        code,
        redirectUri: window.location.origin,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isLoggedIn]);

  return (
    <SortSession
      key={session.version}
      ogList={ogList}
      setStartSort={setStartSort}
      isLoggedIn={isLoggedIn}
    />
  );
};

const SortSession = ({
  ogList,
  setStartSort,
  isLoggedIn,
}: {
  ogList: ListItem[];
  setStartSort: (value: boolean) => void;
  isLoggedIn: boolean;
}) => {
  // Thanks to biasorter.tumblr.com for the code
  // https://biasorter.tumblr.com/
  function initList(eng: SortEngine, ogList: ListItem[]) {
    let n = 0;
    let mid;

    // Clear previous state completely
    eng.lstMember.length = 0;
    eng.parent.length = 0;
    eng.equal.length = 0;
    eng.rec.length = 0;

    // The sequence that you should sort
    eng.lstMember[n] = Array.from({ length: ogList.length }, (_, i) => i);
    eng.parent[n] = -1;
    eng.totalSize = 0;
    n++;

    for (let i = 0; i < eng.lstMember.length; i++) {
      // And element divides it in two/more than two
      // Increase divided sequence of last in first member
      if (eng.lstMember[i].length >= 2) {
        mid = Math.ceil(eng.lstMember[i].length / 2);

        eng.lstMember[n] = eng.lstMember[i].slice(0, mid);
        eng.totalSize += eng.lstMember[n].length;
        eng.parent[n] = i;
        n++;

        eng.lstMember[n] = eng.lstMember[i].slice(mid);
        eng.totalSize += eng.lstMember[n].length;
        eng.parent[n] = i;
        n++;
      }
    }

    // Preserve this sequence
    eng.rec.length = ogList.length;
    eng.rec.fill(0);
    eng.nrec = 0;

    // List that keeps your results
    // Value of link initial
    eng.equal.length = ogList.length + 1;
    eng.equal.fill(-1);

    eng.cmp1 = eng.lstMember.length - 2;
    eng.cmp2 = eng.lstMember.length - 1;
    eng.head1 = 0;
    eng.head2 = 0;
    eng.numQuestion = 1;
    eng.finishSize = 0;
    eng.finishFlag = 0;
  }

  const [initialEngine] = useState(() => {
    const eng = createSortEngine();
    initList(eng, ogList);
    eng.numQuestion++;
    return eng;
  });
  const engineRef = useRef(initialEngine);
  const [finishedSort, setFinishedSort] = useState(false);
  const [goBack, setGoBack] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [option1, setOption1] = useState(
    () => "" + ogList[initialEngine.lstMember[initialEngine.cmp1][0]]?.value
  );
  const [option2, setOption2] = useState(
    () => "" + ogList[initialEngine.lstMember[initialEngine.cmp2][0]]?.value
  );
  const [battle, setBattle] = useState({ num: 1, percent: 0 });
  const [results, setResults] = useState<SortResults | null>(null);
  const ref = useRef<HTMLTableElement>(null);

  // Helper function to add element and its equal chain to rec
  function addToRecWithEquals(
    eng: SortEngine,
    listIndex: number,
    headRef: { value: number }
  ) {
    eng.rec[eng.nrec++] =
      listIndex === 1
        ? eng.lstMember[eng.cmp1][headRef.value++]
        : eng.lstMember[eng.cmp2][headRef.value++];
    eng.finishSize++;

    while (eng.equal[eng.rec[eng.nrec - 1]] !== -1) {
      eng.rec[eng.nrec++] =
        listIndex === 1
          ? eng.lstMember[eng.cmp1][headRef.value++]
          : eng.lstMember[eng.cmp2][headRef.value++];
      eng.finishSize++;
    }
  }

  function sortList(eng: SortEngine, flag: number) {
    const head1Ref = { value: eng.head1 };
    const head2Ref = { value: eng.head2 };

    // rec preservation
    if (flag < 0) {
      addToRecWithEquals(eng, 1, head1Ref);
    } else if (flag > 0) {
      addToRecWithEquals(eng, 2, head2Ref);
    } else {
      addToRecWithEquals(eng, 1, head1Ref);
      eng.equal[eng.rec[eng.nrec - 1]] =
        eng.lstMember[eng.cmp2][head2Ref.value];
      addToRecWithEquals(eng, 2, head2Ref);
    }

    eng.head1 = head1Ref.value;
    eng.head2 = head2Ref.value;

    // Processing after finishing with one list
    if (
      eng.head1 < eng.lstMember[eng.cmp1].length &&
      eng.head2 === eng.lstMember[eng.cmp2].length
    ) {
      // List the remainder of cmp2 copies, list cmp1 copies when finished scanning
      while (eng.head1 < eng.lstMember[eng.cmp1].length) {
        eng.rec[eng.nrec++] = eng.lstMember[eng.cmp1][eng.head1++];
        eng.finishSize++;
      }
    } else if (
      eng.head1 === eng.lstMember[eng.cmp1].length &&
      eng.head2 < eng.lstMember[eng.cmp2].length
    ) {
      // List the remainder of cmp1 copies, list cmp2 copies when finished scanning
      while (eng.head2 < eng.lstMember[eng.cmp2].length) {
        eng.rec[eng.nrec++] = eng.lstMember[eng.cmp2][eng.head2++];
        eng.finishSize++;
      }
    }

    // When it arrives at the end of both lists
    // Update a pro list
    if (
      eng.head1 === eng.lstMember[eng.cmp1].length &&
      eng.head2 === eng.lstMember[eng.cmp2].length
    ) {
      const mergedLength =
        eng.lstMember[eng.cmp1].length + eng.lstMember[eng.cmp2].length;
      eng.lstMember[eng.parent[eng.cmp1]] = eng.rec.slice(0, mergedLength);

      eng.lstMember.pop();
      eng.lstMember.pop();

      eng.cmp1 -= 2;
      eng.cmp2 -= 2;
      eng.head1 = 0;
      eng.head2 = 0;

      // Initialize the rec before performing the new comparison
      eng.rec.fill(0);
      eng.nrec = 0;
    }

    if (eng.cmp1 < 0) {
      setBattle({
        num: eng.numQuestion - 1,
        percent: Math.floor((eng.finishSize * 100) / eng.totalSize),
      });

      setFinishedSort(true);
      setResults({
        lstMember: eng.lstMember.map((members) => [...members]),
        equal: [...eng.equal],
        list: ogList,
      });

      eng.finishFlag = 1;
    } else {
      showSortable(eng);
    }
  }

  function toNameFace(n: number) {
    return ogList[n]?.value;
  }

  // Populate the boxes with items to compare
  function showSortable(eng: SortEngine) {
    const str1 = "" + toNameFace(eng.lstMember[eng.cmp1][eng.head1]);
    const str2 = "" + toNameFace(eng.lstMember[eng.cmp2][eng.head2]);

    setBattle({
      num: eng.numQuestion,
      percent: Math.floor((eng.finishSize * 100) / eng.totalSize),
    });

    setOption1(str1);
    setOption2(str2);

    eng.numQuestion++;
  }

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
        <div className="sort-gridHeader">
          Battle #{battle.num}
          <br />
          {battle.percent}% sorted.
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
            const eng = engineRef.current;
            if (eng.finishFlag === 0) {
              sortList(eng, -1);
            }
          }}
        >
          <div id="leftField">{option1}</div>
        </div>
        <div
          className="sort-both middleField"
          onClick={() => {
            const eng = engineRef.current;
            if (eng.finishFlag === 0) {
              sortList(eng, 0);
            }
          }}
        >
          I like both
        </div>
        <div
          className="sort-rightField"
          onClick={() => {
            const eng = engineRef.current;
            if (eng.finishFlag === 0) {
              sortList(eng, 1);
            }
          }}
        >
          <div id="rightField">{option2}</div>
        </div>
        <div
          className="sort-noOpinion middleField"
          onClick={() => {
            const eng = engineRef.current;
            if (eng.finishFlag === 0) {
              sortList(eng, 0);
            }
          }}
        >
          no opinion
        </div>
      </div>

      {finishedSort && results && (
        <Results
          eng={results}
          ogList={ogList}
          finishedSort={finishedSort}
          showResults={showResults}
          onToggleResults={() => setShowResults((prev) => !prev)}
          tableRef={ref}
        />
      )}
    </>
  );
};

const ResultsItem = ({ ranking, item }: { ranking: number; item: string }) => {
  return (
    <tr className="sort-itemRow">
      <td className="sort-leftItemRow">{ranking}</td>
      <td className="sort-rightItemRow">{item}</td>
    </tr>
  );
};

type SortResults = Pick<SortEngine, "lstMember" | "equal"> & {
  list: ListItem[];
};

const Results = ({
  eng,
  ogList,
  finishedSort,
  showResults,
  onToggleResults,
  tableRef,
}: {
  eng: SortResults;
  ogList: ListItem[];
  finishedSort: boolean;
  showResults: boolean;
  onToggleResults: () => void;
  tableRef: RefObject<HTMLTableElement | null>;
}) => {
  let ranking: number = 1;
  const resultsItems: ReactElement<typeof ResultsItem>[] = [];

  // Safety check: ensure data is valid and consistent
  // lstMember[0] should exist, have the right length, and all indices should be valid
  if (
    !eng.lstMember[0] ||
    eng.lstMember[0].length !== ogList.length ||
    !finishedSort ||
    ogList !== eng.list
  ) {
    return null;
  }

  for (let i = 0; i < ogList.length; i++) {
    const itemIndex = eng.lstMember[0][i];

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

    if (
      i < ogList.length - 1 &&
      eng.equal[eng.lstMember[0][i]] !== eng.lstMember[0][i + 1]
    ) {
      ranking++;
    }
  }

  return (
    <div className="sort-resultsContainer">
      {finishedSort && (
        <button
          className="sort-toggleResults"
          type="button"
          onClick={onToggleResults}
        >
          {showResults ? "Collapse results" : "Show results"}
        </button>
      )}
      {showResults && (
        <>
          <div id="ResultsContainer" className="sort-resultsContainer">
            <table
              id="ResultsTable"
              className="sort-resultsTable"
              ref={tableRef}
            >
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

export default Sort;
