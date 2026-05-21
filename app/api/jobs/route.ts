import { NextResponse } from "next/server";
import { ensureJobRunnerAwake, executeJob } from "@/lib/job-runner";
import { toJobListItem } from "@/lib/job-list-view";
import { createJob, getAssetsByBatchId, getAssetsByIds, getResultAssetSummariesByJobIds, listJobs } from "@/lib/mock-store";
import type { JobItem } from "@/lib/platform-types";
import { getQueueLanes } from "@/lib/platform-data";

export async function GET(request: Request) {
  await ensureJobRunnerAwake();

  const url = new URL(request.url);
  const pageParam = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSizeParam = Number.parseInt(url.searchParams.get("pageSize") ?? "15", 10);
  const page = Math.max(1, Number.isFinite(pageParam) ? pageParam : 1);
  const pageSize = Math.max(1, Math.min(100, Number.isFinite(pageSizeParam) ? pageSizeParam : 15));
  const allJobs = listJobs();
  const totalCount = allJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const jobs = allJobs.slice(startIndex, startIndex + pageSize);
  const jobIds = jobs.map((job) => job.id);
  const includeResultSummaries = url.searchParams.get("includeResultSummaries") === "1";

  return NextResponse.json({
    jobs: jobs.map(toJobListItem),
    resultSummaries: includeResultSummaries ? getResultAssetSummariesByJobIds(jobIds, 1) : [],
    page: safePage,
    pageSize,
    totalCount,
    totalPages,
    lanes: getQueueLanes(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    workflowName?: string;
    itemCount?: number;
    routingPolicy?: string;
    assetIds?: string[];
    preset?: string;
    provider?: "openai" | "local";
    taskType?: "redraw-translate-zh-en" | "translate-zh-en" | "creative-edit";
    providerModelFamily?: "openai" | "gemini" | "dashscope" | "ollama" | "qwen-local" | "local";
    model?: string;
    prompt?: string;
    quality?: string;
    size?: string;
    batchId?: string;
    autoRetryFailedItems?: boolean;
    groupByTopLevelFolder?: boolean;
  };

  const name = body.name?.trim();
  const workflowName = body.workflowName?.trim();
  const routingPolicy = body.routingPolicy?.trim();
  const prompt = body.prompt?.trim();
  const model = body.model?.trim();
  const batchId = body.batchId?.trim();

  if (
    !name ||
    !workflowName ||
    !routingPolicy ||
    (!Array.isArray(body.assetIds) && !batchId) ||
    ((body.assetIds?.length ?? 0) === 0 && !batchId) ||
    !body.taskType ||
    !body.providerModelFamily ||
    !(
      body.taskType === "translate-zh-en"
        ? prompt && model && body.providerModelFamily !== "local"
        : body.provider === "openai" || body.providerModelFamily === "dashscope" || body.providerModelFamily === "qwen-local"
          ? prompt && model
          : body.preset
    )
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const requestedAssetIds = Array.isArray(body.assetIds) ? body.assetIds : [];
  const assetsFromIds = getAssetsByIds(requestedAssetIds).filter((asset) => asset.previewUrl);
  const assets =
    assetsFromIds.length > 0
      ? assetsFromIds
      : batchId
        ? getAssetsByBatchId(batchId).filter((asset) => asset.previewUrl)
        : [];
  if (assets.length === 0) {
    return NextResponse.json(
      { error: "Selected assets do not have local files to process." },
      { status: 400 },
    );
  }

  const groups = new Map<string, typeof assets>();
  for (const asset of assets) {
    const relativePath = asset.relativePath?.replaceAll("\\", "/") ?? "";
    const topLevelFolder = relativePath.includes("/") ? relativePath.split("/")[0] : "";
    const groupName = body.groupByTopLevelFolder && topLevelFolder ? topLevelFolder : "";
    groups.set(groupName, [...(groups.get(groupName) ?? []), asset]);
  }

  const createdJobs = Array.from(groups.entries()).map(([groupName, groupAssets]) => {
    const jobItems: JobItem[] = groupAssets.map((asset) => ({
      assetId: asset.id,
      assetName: asset.name,
      relativePath: asset.relativePath,
      status: "pending",
    }));

    return createJob({
      name: groupName || name,
      workflowName,
      itemCount: groupAssets.length,
      routingPolicy,
      assetIds: groupAssets.map((asset) => asset.id),
      preset: body.preset,
      provider: body.provider ?? "local",
      taskType: body.taskType,
      providerModelFamily: body.providerModelFamily,
      model,
      prompt,
      quality: body.quality,
      size: body.size,
      autoRetryFailedItems: body.autoRetryFailedItems ?? true,
      jobItems,
    });
  });

  for (const job of createdJobs) {
    executeJob(job.id);
  }

  return NextResponse.json({ job: createdJobs[0], jobs: createdJobs }, { status: 201 });
}
