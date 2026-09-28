import { Button } from "@headlessui/react";

export default function FeatureLoadStatus({
  name,
  loading,
  error,
  onCancel,
  onRetry,
}: {
  name: string;
  loading: boolean;
  error: boolean;
  onCancel: () => void;
  onRetry: () => void;
}) {
  if (!loading && !error) return null;
  return (
    <div className="home-listUtilities">
      <span role={error ? "alert" : "status"}>
        {error
          ? `Could not load ${name}. Check your connection and retry.`
          : `Loading ${name}…`}
      </span>
      {error && (
        <Button className="home-listUtility" onClick={onRetry}>
          Retry {name}
        </Button>
      )}
      <Button className="home-listUtility" onClick={onCancel}>
        Cancel {name}
      </Button>
    </div>
  );
}
