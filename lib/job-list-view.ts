import type { Job, JobItem } from "@/lib/platform-types";

export type JobListItem = Omit<Job, "jobItems"> & {
  jobItems?: JobItem[];
  failedItemCount: number;
  retriedItemCount: number;
  fallbackHitCount: number;
  fallbackAttemptCount: number;
};

const FAILED_ITEM_PREVIEW_LIMIT = 5;

export function toJobListItem(job: Job): JobListItem {
  const jobItems = job.jobItems ?? [];
  const hasJobItems = jobItems.length > 0;
  const successCount = hasJobItems ? jobItems.filter((item) => item.status === "succeeded").length : (job.successCount ?? 0);
  const failedItems = jobItems.filter((item) => item.status === "failed");
  const unresolvedFailedItemCount = jobItems.filter(
    (item) => (item.failedAttemptCount ?? 0) > 0 && item.status !== "succeeded",
  ).length;
  const pendingCount = hasJobItems ? jobItems.filter((item) => item.status === "pending").length : (job.pendingCount ?? 0);
  const runningCount = hasJobItems ? jobItems.filter((item) => item.status === "running").length : (job.runningCount ?? 0);
  const failedCount = hasJobItems
    ? job.autoRetryFailedItems === false
      ? failedItems.length
      : unresolvedFailedItemCount
    : (job.failedCount ?? 0);
  const itemCount = hasJobItems ? jobItems.length : job.itemCount;
  const unfinishedCount = Math.max(0, itemCount - successCount - (job.autoRetryFailedItems === false ? failedCount : 0));
  const attentionItems = jobItems.filter(
    (item) => item.status === "failed" || ((item.failedAttemptCount ?? 0) > 0 && item.status !== "succeeded"),
  );
  const fallbackAttemptCount = jobItems.filter((item) =>
    (item.attemptLog ?? []).some((entry) => entry.toLowerCase().startsWith("fallback:")),
  ).length;

  return {
    ...job,
    successCount,
    failedCount,
    unfinishedCount,
    pendingCount,
    runningCount,
    progress: Math.round((successCount / Math.max(1, itemCount)) * 100),
    jobItems: attentionItems.slice(0, FAILED_ITEM_PREVIEW_LIMIT),
    failedItemCount: failedCount,
    retriedItemCount: unresolvedFailedItemCount,
    fallbackHitCount: jobItems.filter((item) => item.endpointUsed === "fallback").length,
    fallbackAttemptCount,
  };
}
