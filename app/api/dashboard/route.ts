import { NextResponse } from "next/server";
import { ensureJobRunnerAwake } from "@/lib/job-runner";
import { toJobListItem } from "@/lib/job-list-view";
import { getDashboardMetrics, getQueueLanes } from "@/lib/platform-data";
import { listJobs, listWorkflows } from "@/lib/mock-store";

export async function GET() {
  await ensureJobRunnerAwake();
  return NextResponse.json({
    metrics: getDashboardMetrics(),
    jobs: listJobs().slice(0, 50).map(toJobListItem),
    queueLanes: getQueueLanes(),
    workflows: listWorkflows(),
  });
}
