import { NextResponse } from "next/server";
import { getDashboardMetrics, getQueueLanes } from "@/lib/platform-data";
import { listJobs, listWorkflows } from "@/lib/mock-store";

export function GET() {
  return NextResponse.json({
    metrics: getDashboardMetrics(),
    jobs: listJobs(),
    queueLanes: getQueueLanes(),
    workflows: listWorkflows(),
  });
}
