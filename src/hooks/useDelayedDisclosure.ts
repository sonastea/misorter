import { useEffect, useRef, useState } from "react";

export function useDelayedDisclosure(mouseDelay: number) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longPress = useRef(false);
  const clear = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
  };
  const close = () => {
    clear();
    longPress.current = false;
    setOpen(false);
  };
  useEffect(() => clear, []);
  return {
    open,
    close,
    handlers: {
      onMouseEnter: () => {
        clear();
        timer.current = setTimeout(() => setOpen(true), mouseDelay);
      },
      onMouseLeave: close,
      onTouchStart: () => {
        close();
        timer.current = setTimeout(() => {
          longPress.current = true;
          setOpen(true);
        }, 500);
      },
      onTouchEnd: () => {
        clear();
        if (!longPress.current) setOpen(false);
      },
      onTouchCancel: close,
    },
  };
}
