import {
  Description,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Radio,
  RadioGroup,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { List } from "@router/listing";
import { useRouter } from "next/router";
import { Dispatch, Fragment, SetStateAction } from "react";
import { trpc } from "src/utils/trpc";
import styles from "../styles/FeaturedLists.module.css";

const FeaturedLists = ({
  open,
  toggleOpen,
  selectedList,
  setSelectedList,
  title,
  updateList,
}: {
  open: boolean;
  toggleOpen: () => void;
  selectedList: string;
  setSelectedList: Dispatch<SetStateAction<string>>;
  title: string;
  updateList: (data: List, featured: boolean) => void;
}) => {
  const router = useRouter();

  const { data, isLoading } = trpc.listing.getFeatured.useQuery(undefined, {
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  return (
    <Transition
      as="div"
      show={open}
      enter="transition duration-300 ease-out"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition duration-200 ease-out"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <TransitionChild
        as={Fragment}
        enter="transition duration-300 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-200 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Dialog open={open} onClose={toggleOpen} className={styles.dialog}>
          <DialogBackdrop
            className="fixed inset-0 bg-white/30 dark:bg-black/30 z-50"
            aria-label="hidden"
          />
          <DialogPanel className={styles.panel}>
            <div className={styles.header}>
              <DialogTitle className={styles.title}>{title}</DialogTitle>
              <button
                onClick={toggleOpen}
                type="button"
                className={`${styles.close} ui-focus-visible:ring-once-hover ui-focus-visible:dark:ring-once ui-focus-visible:ring-2 focus:outline-none`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.closeIcon}
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>

                <span className="sr-only">Close modal</span>
              </button>
            </div>
            <RadioGroup
              className={styles.listContainer}
              value={selectedList}
              onChange={setSelectedList}
            >
              {isLoading ? (
                <svg
                  className="self-center animate-spin -ml-1 mr-3 h-5 w-5 text-light-text-primary dark:text-dark-text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                data?.map((list) => (
                  <Radio
                    key={list.label}
                    value={list.label}
                    className={({ checked }) => {
                      const baseClasses =
                        "border border-dark-bg-secondary/25 hover:text-once-hover hover:dark:text-once relative justify-between mt-2 dark:bg-dark-bg-tertiary cursor-pointer rounded-lg px-5 py-4 shadow-md focus:outline-none";
                      const dynamicClasses = checked
                        ? "text-once-hover dark:text-once ring-1 ring-once dark:ring-dark-primary"
                        : "dark:text-dark-text-primary dark:bg-dark-bg-tertiary";

                      return `${baseClasses} ${dynamicClasses}`.trim();
                    }}
                  >
                    {list.title}
                    <Description className="text-[0.55rem] sm:text-xs text-light-text-secondary/85 dark:text-dark-text-primary/85 space-x-2 whitespace-nowrap overflow-hidden text-ellipsis">
                      {list.items.map(
                        (item: { value: string }, index: number) => (
                          <span
                            key={index}
                            className="dark:text-dark-text-primary/80"
                          >
                            {item.value}
                          </span>
                        )
                      )}
                    </Description>
                  </Radio>
                ))
              )}
            </RadioGroup>
            <div className={styles.buttonContainer}>
              <button
                onClick={() => {
                  updateList(
                    data?.find((list) => list.label === selectedList),
                    true
                  );
                  toggleOpen();
                  router.push("/?list=" + selectedList, undefined, {
                    shallow: true,
                  });
                }}
                className={`${styles.try} ui-focus-visible:ring-light-text-primary ui-focus-visible:dark:ring-dark-text-primary ui-focus-visible:ring-2 focus:outline-none`}
                disabled={isLoading || !selectedList}
              >
                Try it now
              </button>
            </div>
          </DialogPanel>
        </Dialog>
      </TransitionChild>
    </Transition>
  );
};

export default FeaturedLists;
