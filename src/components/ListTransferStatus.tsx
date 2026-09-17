export default function ListTransferStatus({
  message = "",
  tone = "info",
}: {
  message?: string;
  tone?: "info" | "success" | "warning" | "error";
}) {
  return (
    <div className={`transfer-status transfer-status-${tone}`}>
      <p role="status" aria-atomic="true">
        {message && tone !== "error" && (
          <>
            <StatusIcon success={tone === "success"} />
            <span>{message}</span>
          </>
        )}
      </p>
      <p
        role={message && tone === "error" ? "alert" : undefined}
        aria-live="assertive"
        aria-atomic="true"
      >
        {message && tone === "error" && (
          <>
            <StatusIcon />
            <span>{message}</span>
          </>
        )}
      </p>
    </div>
  );
}

function StatusIcon({ success = false }: { success?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      focusable="false"
    >
      {success ? (
        <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6m0 3v1" />
        </>
      )}
    </svg>
  );
}
