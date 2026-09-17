import { Button, Popover, PopoverPanel, Transition } from "@headlessui/react";
import { useEffect, useRef, useState } from "react";

const discoveryKey = "misorter:trending-discovery-dismissed:v1";

const FeaturedListsToggle = ({
  toggleFeaturedLists,
  open,
  showDiscovery,
  loading,
  failed,
}: {
  toggleFeaturedLists: () => void;
  open: boolean;
  showDiscovery: boolean;
  loading: boolean;
  failed: boolean;
}) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showDiscovery || open || dismissed) return;
    try {
      if (localStorage.getItem(discoveryKey)) return;
    } catch {
      // The hint still works when browser storage is unavailable.
    }
    const timer = window.setTimeout(() => setVisible(true), 1000);
    return () => window.clearTimeout(timer);
  }, [showDiscovery, open, dismissed]);

  const dismiss = () => {
    setDismissed(true);
    setVisible(false);
    try {
      localStorage.setItem(discoveryKey, "true");
    } catch {
      // Keep dismissal in memory for this visit.
    }
  };

  const explore = () => {
    dismiss();
    buttonRef.current?.focus();
    toggleFeaturedLists();
  };

  return (
    <Popover className="featuredLists-discovery">
      <Button
        ref={buttonRef}
        className="toggle featuredLists group"
        type="button"
        onClick={explore}
        title="Explore trending lists"
        aria-label="Explore trending lists"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-busy={loading}
        disabled={loading}
      >
        <span className="toggleIcon" aria-hidden="true">
          {loading ? "…" : "🔥"}
        </span>
      </Button>
      {loading && (
        <span className="sr-only" role="status">
          Loading trending lists
        </span>
      )}
      {failed && (
        <div className="featuredLists-callout" role="alert">
          <p>Couldn’t load trending lists.</p>
          <Button className="home-start" onClick={explore}>
            Retry loading lists
          </Button>
        </div>
      )}
      <Transition show={visible && showDiscovery && !open && !dismissed}>
        {/* Visibility is controlled by first-visit state, not a toggle click. */}
        <PopoverPanel
          static
          as="aside"
          className="featuredLists-callout"
          aria-label="Discover trending lists"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              dismiss();
              buttonRef.current?.focus();
            }
          }}
        >
          <div role="status">
            <h2>Discover trending lists</h2>
            <p>Pick a list and try ranking it yourself.</p>
          </div>
          <div className="featuredLists-calloutActions">
            <Button className="home-start" onClick={explore}>
              Explore lists
            </Button>
            <Button
              className="home-reset"
              onClick={() => {
                dismiss();
                buttonRef.current?.focus();
              }}
            >
              Dismiss
            </Button>
          </div>
        </PopoverPanel>
      </Transition>
    </Popover>
  );
};

export default FeaturedListsToggle;
