import { useQuery } from "@tanstack/react-query";
import { trpc } from "@utils/trpc";
import { useState } from "react";
import { type NoticeType } from "@/db/schema";

const NoticeBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  const { data: notice } = useQuery({
    ...trpc.notice.getActive.queryOptions(),
    refetchInterval: 60000, // Refetch every minute to check for new notices
  });

  if (!notice || dismissed) {
    return null;
  }

  const getTypeStyles = (type: NoticeType) => {
    switch (type) {
      case "warning":
        return "notice-banner-warning";
      case "error":
        return "notice-banner-error";
      case "success":
        return "notice-banner-success";
      case "info":
        return "notice-banner-info";
    }
  };

  return (
    <div className={`notice-banner ${getTypeStyles(notice.type)}`}>
      <div className="notice-banner-content">
        <p className="notice-banner-message">{notice.message}</p>
        <button
          onClick={() => setDismissed(true)}
          className="notice-banner-dismiss"
          aria-label="Dismiss notice"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="notice-banner-dismiss-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NoticeBanner;
