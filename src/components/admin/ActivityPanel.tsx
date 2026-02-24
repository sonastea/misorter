import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

const actionLabels = {
  listing_delete: "Deleted listing",
  listing_delete_many: "Bulk delete",
  listing_create: "Created listing",
  listing_update: "Updated listing",
} as const;

const getActionLabel = (action: string) => {
  return (
    actionLabels[action as keyof typeof actionLabels] ??
    action.split("_").join(" ")
  );
};

const formatCount = (count: number) => {
  return `${count} listing${count === 1 ? "" : "s"}`;
};

const formatClockTime = (date: Date | string) => {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

const formatTimeAgo = (date: Date | string) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
};

const ActivityPanel = () => {
  const { data, isLoading } = useQuery(
    trpc.activity.getRecent.queryOptions({ limit: 10 })
  );

  if (isLoading) {
    return (
      <section
        className="adminDashboard-activityLog adminDashboard-activityLog--console"
        aria-label="Activity log"
      >
        <h3 className="adminDashboard-activityLogHeader">Recent Activity</h3>
        <div className="adminDashboard-activityLogList">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="adminDashboard-activityLogItem">
              <span className="adminDashboard-activityLogPrompt">&gt;</span>
              <span className="adminDashboard-activityLogTimestamp">
                --:--:--
              </span>
              <div className="adminDashboard-activityLogContent">
                <div className="adminDashboard-activityLogLoading">
                  connecting to activity stream...
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const logs = data?.logs ?? [];

  if (logs.length === 0) {
    return (
      <section
        className="adminDashboard-activityLog adminDashboard-activityLog--console"
        aria-label="Activity log"
      >
        <h3 className="adminDashboard-activityLogHeader">Recent Activity</h3>
        <p className="adminDashboard-activityLogEmpty">&gt; no activity yet</p>
      </section>
    );
  }

  return (
    <section
      className="adminDashboard-activityLog adminDashboard-activityLog--console"
      aria-label="Activity log"
    >
      <h3 className="adminDashboard-activityLogHeader">Recent Activity</h3>
      <ul className="adminDashboard-activityLogList">
        {logs.map((log) => {
          const actionText = getActionLabel(log.action);
          const targetCount = log.targetCount ?? 1;
          const detailText = log.details?.trim()
            ? log.details
            : log.targetLabel
              ? `target ${log.targetLabel}`
              : formatCount(targetCount);

          return (
            <li key={log.id} className="adminDashboard-activityLogItem">
              <span
                className="adminDashboard-activityLogPrompt"
                aria-hidden="true"
              >
                &gt;
              </span>
              <time
                className="adminDashboard-activityLogTimestamp"
                dateTime={new Date(log.createdAt).toISOString()}
              >
                {formatClockTime(log.createdAt)}
              </time>
              <div className="adminDashboard-activityLogContent">
                <p className="adminDashboard-activityLogActionLine">
                  <span className="adminDashboard-activityLogAction">
                    {actionText}
                  </span>
                  <span className="adminDashboard-activityLogRelative">
                    {formatTimeAgo(log.createdAt)}
                  </span>
                </p>
                <p className="adminDashboard-activityLogTarget">{detailText}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default ActivityPanel;
