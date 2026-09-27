import { Button, PopoverPanel } from "@headlessui/react";
import { type RefObject, useEffect, useRef } from "react";

const discoveryKey = "misorter:usage-tips-dismissed:v1";
let dismissedThisVisit = false;

export function usageTipsWereDismissed() {
  if (dismissedThisVisit) return true;
  try {
    return localStorage.getItem(discoveryKey) === "true";
  } catch {
    return false;
  }
}

export function rememberUsageTipsDismissal() {
  dismissedThisVisit = true;
  try {
    localStorage.setItem(discoveryKey, "true");
  } catch {
    // Keep dismissal for this visit when browser storage is unavailable.
  }
}

type UsageTip = {
  id: string;
  title: string;
  description: string;
  touchDescription?: string;
};

// Add future tips here; their layout and dismissal behavior are shared.
const usageTips: UsageTip[] = [
  {
    id: "title",
    title: "Name your list",
    description: "Use Edit, or double-click the title.",
    touchDescription: "Tap Edit, or double-tap the title.",
  },
  {
    id: "items",
    title: "Add and rank",
    description: "Add at least two items, then choose Start.",
  },
  {
    id: "choices",
    title: "Choose carefully",
    description:
      "Use No opinion and I like both sparingly for more precise rankings.",
  },
];

const UsageTips = ({
  onDismiss,
  returnFocusRef,
}: {
  onDismiss: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) => {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      const returnFocus = panelRef.current?.contains(document.activeElement);
      onDismiss();
      if (returnFocus) returnFocusRef.current?.focus();
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onDismiss, returnFocusRef]);

  const dismissAndReturnFocus = () => {
    onDismiss();
    returnFocusRef.current?.focus();
  };

  return (
    <PopoverPanel
      static
      as="aside"
      ref={panelRef}
      className="usageTips-region"
      aria-label="Quick tips"
    >
      <div className="usageTips-panel">
        <div role="status">
          <h2>Quick tips</h2>
          <ul className="usageTips-list">
            {usageTips.map((tip) => (
              <li key={tip.id}>
                <h3>{tip.title}</h3>
                <p
                  className={
                    tip.touchDescription ? "usageTips-mouse" : undefined
                  }
                >
                  {tip.description}
                </p>
                {tip.touchDescription && (
                  <p className="usageTips-touch">{tip.touchDescription}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
        <Button
          type="button"
          className="usageTips-close"
          aria-label="Dismiss quick tips"
          onClick={dismissAndReturnFocus}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m6 6 12 12M6 18 18 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </Button>
        <div className="usageTips-actions">
          <Button
            type="button"
            className="usageTips-done"
            onClick={dismissAndReturnFocus}
          >
            Got it
          </Button>
        </div>
      </div>
    </PopoverPanel>
  );
};

export default UsageTips;
