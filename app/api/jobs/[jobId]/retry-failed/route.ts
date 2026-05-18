import { NextResponse } from "next/server";
import { executeJob, isJobScheduled, recoverJobState } from "@/lib/job-runner";
import { getJobById, reconcileJobOutputState, updateJob, updateJobItems } from "@/lib/mock-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = reconcileJobOutputState(jobId) ?? recoverJobState(jobId) ?? getJobById(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if ((job.status === "running" || job.status === "queued") && isJobScheduled(jobId)) {
    return NextResponse.json({ error: "This job is already running." }, { status: 409 });
  }

  const retryableItems = (job.jobItems ?? []).filter(
    (item) => item.status === "failed" && !item.outputAssetId,
  );
  if (!retryableItems.length) {
    return NextResponse.json({ error: "This job has no incomplete items to retry." }, { status: 400 });
  }

  updateJobItems(jobId, (items) =>
    items.map((item) =>
      item.status === "failed" && !item.outputAssetId
        ? {
            ...item,
            status: "pending",
            error: undefined,
            endpointUsed: undefined,
            attemptLog: undefined,
            attemptCount: 0,
            failedAttemptCount: 0,
            startedAt: undefined,
            finishedAt: undefined,
          }
        : item,
    ),
  );

  const refreshedItems =
    getJobById(jobId)?.jobItems?.map((item) => ({
      ...item,
    })) ?? [];
  const successCount = refreshedItems.filter((item) => item.status === "succeeded").length;
  const terminalFailedCount = refreshedItems.filter((item) => item.status === "failed").length;
  const unresolvedFailedCount = refreshedItems.filter(
    (item) => (item.failedAttemptCount ?? 0) > 0 && item.status !== "succeeded",
  ).length;
  const failedCount = job.autoRetryFailedItems === false ? terminalFailedCount : unresolvedFailedCount;
  const pendingCount = refreshedItems.filter((item) => item.status === "pending").length;
  const runningCount = refreshedItems.filter((item) => item.status === "running").length;

  const refreshedJob = updateJob(jobId, {
    status: "queued",
    statusTone: "amber",
    successCount,
    failedCount,
    unfinishedCount: Math.max(0, refreshedItems.length - successCount),
    pendingCount,
    runningCount,
    outputCount: successCount,
    progress: Math.round((successCount / Math.max(1, refreshedItems.length)) * 100),
    finishedAt: undefined,
  });

  executeJob(jobId);

  return NextResponse.json({ job: refreshedJob }, { status: 200 });
}
