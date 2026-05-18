import { NextResponse } from "next/server";
import { executeJob, isJobScheduled } from "@/lib/job-runner";
import { getJobById, updateJob } from "@/lib/mock-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { paused?: boolean };
  const job = getJobById(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (body.paused === false) {
    const resumed = updateJob(jobId, {
      pausedAt: undefined,
      status: "queued",
      statusTone: "amber",
      finishedAt: undefined,
    });

    if (!isJobScheduled(jobId)) {
      executeJob(jobId);
    }

    return NextResponse.json({ job: resumed }, { status: 200 });
  }

  const paused = updateJob(jobId, {
    pausedAt: new Date().toISOString(),
    status: "paused",
    statusTone: "amber",
  });

  return NextResponse.json({ job: paused }, { status: 200 });
}
