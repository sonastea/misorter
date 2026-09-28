import { useEffect, useRef, useState } from "react";

/** A request belongs to this mounted owner and can be canceled without aborting shared code loading. */
export function useFeatureRequest<T>(load: () => Promise<T>) {
  const [module, setModule] = useState<T>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const revision = useRef(0);
  const busy = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(
    () => () => {
      revision.current++;
      busy.current = false;
    },
    []
  );
  const cancel = () => {
    revision.current++;
    busy.current = false;
    setLoading(false);
    setError(false);
    trigger.current?.focus();
  };
  const request = async (ready: (module: T) => void) => {
    if (busy.current) return;
    if (!error && document.activeElement instanceof HTMLElement) {
      trigger.current = document.activeElement;
    }
    busy.current = true;
    const id = ++revision.current;
    setLoading(true);
    setError(false);
    try {
      const result = await load();
      if (id !== revision.current) return;
      setModule(() => result);
      // Headless UI records this control as the dialog's restoration target,
      // even if the user moved focus while the module was downloading.
      trigger.current?.focus();
      ready(result);
    } catch {
      if (id === revision.current) setError(true);
    } finally {
      if (id === revision.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  };
  return { module, loading, error, request, cancel };
}
