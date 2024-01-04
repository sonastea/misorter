import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import styles from "../styles/FeaturedLists.module.css";

const FeaturedLists = ({
  open,
  toggleOpen,
  title,
}: {
  open: boolean;
  toggleOpen: () => void;
  title: string;
}) => {
  return (
    <Transition
      show={open}
      enter="transition duration-500 ease-out"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition duration-200 ease-out"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <Transition.Child
        as={Fragment}
        enter="transition-opacity ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-out duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className={styles.backdrop} aria-hidden="true" />
      </Transition.Child>

      <Transition.Child
        as={Fragment}
        enter="transition duration-500 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-200 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Dialog open={open} onClose={toggleOpen} className={styles.dialog}>
          <Dialog.Panel className={styles.panel}>
            <div className={styles.header}>
              <h3 className={styles.title}>{title}</h3>
              <button
                onClick={toggleOpen}
                type="button"
                className={styles.close}
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
            <div className={styles.buttonContainer}>
              <button className={styles.try}>Try it now</button>
            </div>
          </Dialog.Panel>
        </Dialog>
      </Transition.Child>
    </Transition>
  );
};

export default FeaturedLists;
