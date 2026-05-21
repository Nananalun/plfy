import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { deleteAssetsBySource, deleteJob, getAssetsBySource, getJobById, updateJob } from "@/lib/mock-store";

function resolvePublicAssetPath(previewUrl: string) {
  const publicDir = path.join(process.cwd(), "public");
  const filePath = path.resolve(publicDir, previewUrl.replace(/^\//, ""));
  return filePath.startsWith(publicDir + path.sep) ? filePath : undefined;
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = getJobById(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const outputs = getAssetsBySource(`job:${jobId}`);
  for (const asset of outputs) {
    if (!asset.previewUrl) {
      continue;
    }

    const filePath = resolvePublicAssetPath(asset.previewUrl);
    if (filePath && existsSync(filePath)) {
      await rm(filePath, { force: true });
    }
  }

  deleteAssetsBySource(`job:${jobId}`);
  deleteJob(jobId);

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = getJobById(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const body = (await request.json()) as { prompt?: string };
  const prompt = String(body.prompt ?? "").trim();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const updated = updateJob(jobId, { prompt });
  return NextResponse.json({ job: updated });
}
