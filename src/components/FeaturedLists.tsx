import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

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
        <div
          className="fixed inset-0 bg-light-bg-secondary dark:bg-dark-bg-tertiary bg-opacity-10 dark:bg-opacity-10 backdrop-blur-sm z-[999]"
          aria-hidden="true"
        />
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
        <Dialog
          open={open}
          onClose={toggleOpen}
          className="fixed inset-0 flex items-center justify-center z-[999]"
        >
          <Dialog.Panel className="border border-light-bg-secondary dark:border-dark-bg-tertiary w-3/4 sm:w-1/2 rounded-lg shadow-md bg-light-bg-primary dark:bg-dark-bg-secondary">
            <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
              <h3 className="dark:text-dark-text-primary">{title}</h3>
              <button
                onClick={toggleOpen}
                type="button"
                className="hover:bg-light-bg-secondary dark:text-dark-text-primary rounded-lg text-sm h-8 w-8 ms-auto inline-flex justify-center items-center dark:hover:bg-dark-bg-tertiary"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>

                <span className="sr-only">Close modal</span>
              </button>
            </div>
            <div className="p-4">
              <button className="text-once hover:text-light-bg-primary hover:bg-once inline-flex w-full justify-center font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:text-dark-bg-primary hover:dark:text-dark-bg-primary dark:bg-once-dark hover:dark:bg-once-hover">
                Try it now
              </button>
            </div>
          </Dialog.Panel>
        </Dialog>
      </Transition.Child>
    </Transition>
  );
};

export default FeaturedLists;
