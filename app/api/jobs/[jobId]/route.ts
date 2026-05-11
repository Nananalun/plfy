import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { deleteAssetsBySource, deleteJob, getAssetsBySource, getJobById } from "@/lib/mock-store";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = getJobById(jobId);

  if (!job) {
    return NextResponse.json({ error: "任务不存在。" }, { status: 404 });
  }

  const outputs = getAssetsBySource(`job:${jobId}`);
  for (const asset of outputs) {
    if (!asset.previewUrl) {
      continue;
    }

    const filePath = path.join(process.cwd(), "public", asset.previewUrl.replace(/^\//, ""));
    if (existsSync(filePath)) {
      await rm(filePath, { force: true });
    }
  }

  deleteAssetsBySource(`job:${jobId}`);
  deleteJob(jobId);

  return NextResponse.json({ ok: true });
}
