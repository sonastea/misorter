import {
  Button,
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Fragment, lazy, Suspense, useState, useEffect, useRef } from "react";

const SupportFormContent = lazy(
  () => import("@/components/SupportFormContent")
);

function SupportFormSkeleton() {
  return (
    <div className="supportForm-loading" role="status">
      <span className="supportForm-loadingLabel">Loading support form</span>
      <div aria-hidden="true">
        <div className="supportForm-typeToggle">
          <div className="supportForm-skeleton supportForm-skeleton-tab" />
          <div className="supportForm-skeleton supportForm-skeleton-tab" />
        </div>
        <div className="supportForm-form">
          <div className="supportForm-skeleton supportForm-skeleton-label" />
          <div className="supportForm-skeleton supportForm-skeleton-control" />
          <div className="supportForm-skeleton supportForm-skeleton-label" />
          <div className="supportForm-skeleton supportForm-skeleton-message" />
          <div className="supportForm-skeleton supportForm-skeleton-label" />
          <div className="supportForm-skeleton supportForm-skeleton-control" />
          <div className="supportForm-skeleton supportForm-skeleton-note" />
          <div className="supportForm-skeleton supportForm-skeleton-control" />
        </div>
      </div>
    </div>
  );
}

const SupportForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  // Only mount the lazy contents after first use, then retain unfinished drafts.
  const [hasOpened, setHasOpened] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollThreshold = 300;
      setIsVisible(window.scrollY < scrollThreshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="supportForm-container">
      <Button
        ref={triggerRef}
        type="button"
        className={`supportForm-trigger ${!isVisible ? "supportForm-trigger-hidden" : ""}`}
        aria-haspopup="dialog"
        onClick={() => {
          setHasOpened(true);
          setIsOpen(true);
        }}
      >
        Help & Feedback
      </Button>

      {hasOpened && (
        <Transition
          appear
          show={isOpen}
          as={Fragment}
          unmount={false}
          afterLeave={() => triggerRef.current?.focus({ preventScroll: true })}
        >
          <Dialog
            as="div"
            className="supportForm-dialog"
            onClose={() => setIsOpen(false)}
            unmount={false}
          >
            <TransitionChild
              as={Fragment}
              unmount={false}
              enter="supportForm-backdrop-enter"
              enterFrom="supportForm-backdrop-enterFrom"
              enterTo="supportForm-backdrop-enterTo"
              leave="supportForm-backdrop-leave"
              leaveFrom="supportForm-backdrop-leaveFrom"
              leaveTo="supportForm-backdrop-leaveTo"
            >
              <div className="supportForm-backdrop" aria-hidden="true" />
            </TransitionChild>

            <div className="supportForm-panelContainer">
              <TransitionChild
                as={Fragment}
                unmount={false}
                enter="supportForm-panel-enter"
                enterFrom="supportForm-panel-enterFrom"
                enterTo="supportForm-panel-enterTo"
                leave="supportForm-panel-leave"
                leaveFrom="supportForm-panel-leaveFrom"
                leaveTo="supportForm-panel-leaveTo"
              >
                <DialogPanel className="supportForm-panel">
                  <div className="supportForm-headerRow">
                    <DialogTitle as="h3" className="supportForm-title">
                      Help & Feedback Form
                    </DialogTitle>
                    <Button
                      type="button"
                      autoFocus
                      className="supportForm-close"
                      onClick={() => setIsOpen(false)}
                      aria-label="Close support form"
                    >
                      Close
                    </Button>
                  </div>

                  <Suspense fallback={<SupportFormSkeleton />}>
                    <SupportFormContent onClose={() => setIsOpen(false)} />
                  </Suspense>
                </DialogPanel>
              </TransitionChild>
            </div>
          </Dialog>
        </Transition>
      )}
    </div>
  );
};

export default SupportForm;
