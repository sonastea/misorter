import { Button, Popover } from "@headlessui/react";
import { RefObject, useEffect, useId, useRef, useState } from "react";
import UsageTips from "@/components/UsageTips";

const ListTitle = ({
  title,
  setEditTitle,
  focusRef,
  showTips,
  onDismissTips,
  containerRef,
}: {
  title: string;
  setEditTitle: (value: boolean) => void;
  focusRef?: RefObject<boolean>;
  showTips: boolean;
  onDismissTips: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const shortcutId = useId();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const lastTapRef = useRef<{
    time: number;
    x: number;
    y: number;
  } | null>(null);

  const startEditing = () => {
    onDismissTips();
    setEditTitle(true);
  };

  useEffect(() => {
    return () => clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    if (focusRef?.current && buttonRef.current) {
      buttonRef.current.focus();
      focusRef.current = false;
    }
  }, [focusRef]);

  return (
    <Popover
      ref={containerRef}
      className="home-titleContainer"
      data-revealed={hovered || focused || showTips}
      onPointerEnter={(event) => {
        if (event.pointerType === "touch") return;
        clearTimeout(closeTimerRef.current);
        setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "touch") return;
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
          setHovered(false);
        }, 250);
      }}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        setFocused(false);
      }}
    >
      <h1 className="home-title-wrapper">
        <Button
          type="button"
          className="home-title"
          onClick={(event) => {
            // Native keyboard and assistive-technology activation has no click count.
            if (event.detail === 0) startEditing();
          }}
          onDoubleClick={startEditing}
          onPointerUp={(event) => {
            if (event.pointerType === "mouse" || !event.isPrimary) return;
            const previous = lastTapRef.current;
            const tap = {
              time: event.timeStamp,
              x: event.clientX,
              y: event.clientY,
            };
            if (
              previous &&
              tap.time - previous.time < 400 &&
              Math.hypot(tap.x - previous.x, tap.y - previous.y) < 24
            ) {
              lastTapRef.current = null;
              startEditing();
            } else {
              lastTapRef.current = tap;
            }
          }}
          onPointerCancel={() => {
            lastTapRef.current = null;
          }}
          aria-label={`Edit list title: ${title}`}
          aria-describedby={shortcutId}
        >
          {title}
        </Button>
      </h1>
      <Button
        ref={buttonRef}
        type="button"
        className="home-editTitleButton"
        onClick={startEditing}
        aria-label="Edit title"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"
          />
        </svg>
        Edit
      </Button>
      <span id={shortcutId} className="sr-only">
        Double-click or double-tap to edit
      </span>
      {showTips && (
        <UsageTips onDismiss={onDismissTips} returnFocusRef={buttonRef} />
      )}
    </Popover>
  );
};

export default ListTitle;
