import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { runDashScopeImageJob } from "@/lib/dashscope-image-runner";
import { createAsset, getAssetsByIds, getJobById, listJobs, reconcileJobOutputState, updateJob, updateJobItems } from "@/lib/mock-store";
import { runGeminiTranslationJob } from "@/lib/gemini-translation-runner";
import { runLocalImageJob } from "@/lib/local-image-runner";
import { runOllamaTranslationJob } from "@/lib/ollama-translation-runner";
import { buildOutputName, buildOutputRelativePath } from "@/lib/output-naming";
import { runOpenAIImageJob } from "@/lib/openai-image-runner";
import { runOpenAITranslationJob } from "@/lib/openai-translation-runner";
import { getJobRunnerMaxParallelJobs, getOllamaConfig, getProviderSecret } from "@/lib/provider-secrets";
import { runQwenImageEditJob } from "@/lib/qwen-image-edit-runner";
import type { Asset, Job, JobItem, StatusTone } from "@/lib/platform-types";
import { renderTranslationOverlay } from "@/lib/translation-overlay";

const schedulerWorkerId = randomUUID();
const locksDir = path.join(process.cwd(), "data", "job-runner-locks");
const schedulerLockFile = path.join(locksDir, "scheduler.json");
const SLOT_STALE_MS = 60_000;
const SCHEDULER_LOCK_STALE_MS = 10_000;
const RUNNER_WAKE_INTERVAL_MS = 2_000;
const RUNNER_IDLE_POLL_INTERVAL_MS = 5_000;
const JOB_HEARTBEAT_STORE_INTERVAL_MS = 45_000;
const MAX_AUTO_RETRY_FAILED_ATTEMPTS = 3;
let scheduling = false;
let scheduleRequested = false;
let lastRunnerWakeAt = 0;
let runnerIdlePollTimer: ReturnType<typeof setInterval> | undefined;
const lastJobHeartbeatStoreWriteAt = new Map<string, number>();

function deferToNextTick() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

type SlotLock = {
  jobId: string;
  workerId: string;
  slotId: number;
  heartbeatAt: string;
};

function ensureLocksDir() {
  if (!existsSync(locksDir)) {
    mkdirSync(locksDir, { recursive: true });
  }
}

function slotFilePath(slotId: number) {
  return path.join(locksDir, `slot-${slotId}.json`);
}

function getKnownSlotIds() {
  ensureLocksDir();
  const slotIds = new Set<number>();
  for (let slotId = 1; slotId <= getJobRunnerMaxParallelJobs(); slotId += 1) {
    slotIds.add(slotId);
  }

  for (const entry of readdirSync(locksDir, { withFileTypes: true })) {
    const match = /^slot-(\d+)\.json$/.exec(entry.name);
    if (entry.isFile() && match) {
      slotIds.add(Number.parseInt(match[1], 10));
    }
  }

  return [...slotIds].filter(Number.isFinite).sort((a, b) => a - b);
}

function nowIso() {
  return new Date().toISOString();
}

function parseSlotLock(slotId: number) {
  const filePath = slotFilePath(slotId);
  if (!existsSync(filePath)) {
    return undefined;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as SlotLock;
  } catch {
    return undefined;
  }
}

function writeSlotLock(lock: SlotLock, exclusive: boolean) {
  ensureLocksDir();
  writeFileSync(slotFilePath(lock.slotId), JSON.stringify(lock), {
    encoding: "utf8",
    flag: exclusive ? "wx" : "w",
  });
}

function clearSlotLock(slotId: number) {
  const filePath = slotFilePath(slotId);
  if (existsSync(filePath)) {
    rmSync(filePath, { force: true });
  }
}

function acquireSchedulerLock() {
  ensureLocksDir();

  if (existsSync(schedulerLockFile)) {
    try {
      const lock = JSON.parse(readFileSync(schedulerLockFile, "utf8")) as { workerId?: string; heartbeatAt?: string };
      const age = Date.now() - new Date(lock.heartbeatAt ?? "").getTime();
      if (!Number.isFinite(age) || age < 0 || age > SCHEDULER_LOCK_STALE_MS) {
        rmSync(schedulerLockFile, { force: true });
      }
    } catch {
      rmSync(schedulerLockFile, { force: true });
    }
  }

  try {
    writeFileSync(
      schedulerLockFile,
      JSON.stringify({
        workerId: schedulerWorkerId,
        heartbeatAt: nowIso(),
      }),
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    return true;
  } catch {
    return false;
  }
}

function releaseSchedulerLock() {
  if (!existsSync(schedulerLockFile)) {
    return;
  }

  try {
    const lock = JSON.parse(readFileSync(schedulerLockFile, "utf8")) as { workerId?: string };
    if (lock.workerId === schedulerWorkerId) {
      rmSync(schedulerLockFile, { force: true });
    }
  } catch {
    rmSync(schedulerLockFile, { force: true });
  }
}

function isFreshHeartbeat(heartbeatAt?: string) {
  if (!heartbeatAt) {
    return false;
  }

  const age = Date.now() - new Date(heartbeatAt).getTime();
  return Number.isFinite(age) && age >= 0 && age < SLOT_STALE_MS;
}

function touchJobHeartbeat(jobId: string, slotId: number) {
  const current = parseSlotLock(slotId);
  if (current && current.jobId !== jobId) {
    return false;
  }

  const heartbeatAt = nowIso();
  writeSlotLock({
    jobId,
    workerId: schedulerWorkerId,
    slotId,
    heartbeatAt,
  }, false);

  const now = Date.now();
  const lastStoreWriteAt = lastJobHeartbeatStoreWriteAt.get(jobId) ?? 0;
  if (now - lastStoreWriteAt >= JOB_HEARTBEAT_STORE_INTERVAL_MS) {
    lastJobHeartbeatStoreWriteAt.set(jobId, now);
    updateJob(jobId, {
      heartbeatAt,
      runnerWorkerId: schedulerWorkerId,
      runnerSlotId: slotId,
    });
  }
  return true;
}

function releaseJobSlot(jobId: string, slotId: number) {
  const current = parseSlotLock(slotId);
  if (current?.jobId === jobId) {
    clearSlotLock(slotId);
  }

  const remainingSlot = getKnownSlotIds()
    .map((knownSlotId) => parseSlotLock(knownSlotId))
    .find((lock): lock is SlotLock => Boolean(lock?.jobId === jobId && isFreshHeartbeat(lock.heartbeatAt)));

  if (remainingSlot) {
    updateJob(jobId, {
      runnerWorkerId: remainingSlot.workerId,
      runnerSlotId: remainingSlot.slotId,
      heartbeatAt: remainingSlot.heartbeatAt,
    });
    return;
  }

  updateJob(jobId, {
    runnerWorkerId: undefined,
    runnerSlotId: undefined,
    heartbeatAt: undefined,
  });
  lastJobHeartbeatStoreWriteAt.delete(jobId);
}

function slotLockBelongsToRunningJob(lock: SlotLock) {
  const job = getJobById(lock.jobId);
  if (!job) {
    return false;
  }

  const jobItems = job.jobItems ?? [];
  const hasOpenItems = jobItems.some((item) => item.status === "pending" || item.status === "running");
  return hasOpenItems && (job.status === "queued" || job.status === "running" || job.status === "partial" || job.status === "failed");
}

function cleanupStaleSlot(slotId: number) {
  const filePath = slotFilePath(slotId);
  const lock = parseSlotLock(slotId);
  if (!lock) {
    if (existsSync(filePath)) {
      clearSlotLock(slotId);
    }
    return;
  }

  if (isFreshHeartbeat(lock.heartbeatAt) && slotLockBelongsToRunningJob(lock)) {
    return;
  }

  clearSlotLock(slotId);
}

function acquireSlot(jobId: string) {
  ensureLocksDir();

  const hasFreshJobLock = () => {
    for (const slotId of getKnownSlotIds()) {
      cleanupStaleSlot(slotId);
      const existingLock = parseSlotLock(slotId);
      if (existingLock?.jobId === jobId && isFreshHeartbeat(existingLock.heartbeatAt)) {
        return true;
      }
    }
    return false;
  };

  if (hasFreshJobLock()) {
    return undefined;
  }

  for (let slotId = 1; slotId <= getJobRunnerMaxParallelJobs(); slotId += 1) {
    if (hasFreshJobLock()) {
      return undefined;
    }

    cleanupStaleSlot(slotId);
    const existingLock = parseSlotLock(slotId);
    if (existingLock?.jobId === jobId && isFreshHeartbeat(existingLock.heartbeatAt)) {
      return undefined;
    }
    if (existingLock) {
      continue;
    }
    try {
      writeSlotLock(
        {
          jobId,
          workerId: schedulerWorkerId,
          slotId,
          heartbeatAt: nowIso(),
        },
        true,
      );
      return slotId;
    } catch {
      continue;
    }
  }

  return undefined;
}

function pathExtToKind(filename: string) {
  const match = filename.split(".").pop();
  return match ? match.toUpperCase() : "FILE";
}

function createBaseRedrawPrompt(userPrompt: string) {
  const trimmedPrompt = userPrompt.trim();
  if (trimmedPrompt) {
    return trimmedPrompt;
  }

  return [
    "Edit this existing image, not a new concept.",
    "Replace all visible Chinese text with natural English.",
    "Keep the original composition, layout, subject, background, spacing, hierarchy, colors, and visual style as close to the source image as possible.",
    "Do not add unrelated objects, logos, decorations, or extra text.",
    "Do not keep any Chinese characters in the final image.",
    "Make the final result look like a clean production-ready English version of the original.",
  ]
    .filter(Boolean)
    .join("\n");
}

function createStableOpenAIImagePrompt(userPrompt: string) {
  const prompt = userPrompt.trim();
  if (!prompt) {
    return "Make a clean English version of this image.";
  }

  const asksForTextTranslation =
    /chinese/i.test(prompt) ||
    /translate/i.test(prompt) ||
    /natural english/i.test(prompt) ||
    /english version/i.test(prompt);

  if (asksForTextTranslation) {
    return "Make a clean English version of this image.";
  }

  return prompt;
}

async function buildRedrawPrompts(assets: Asset[], userPrompt: string) {
  const prompts = new Map<string, string>();
  const fallbackPrompt = createBaseRedrawPrompt(userPrompt);

  for (const asset of assets) {
    prompts.set(asset.id, fallbackPrompt);
  }

  try {
    const ollamaConfig = getOllamaConfig();
    const analysis = ollamaConfig.visionModel
      ? await runOllamaTranslationJob({
          assets,
          model: ollamaConfig.visionModel,
          prompt: "Identify every visible Chinese text block and translate it into concise natural English.",
        })
      : getProviderSecret("openai")
        ? await runOpenAITranslationJob({
            assets,
            model: "gpt-4.1-mini",
            prompt: "Identify every visible Chinese text block and translate it into concise natural English.",
          })
        : getProviderSecret("gemini")
          ? await runGeminiTranslationJob({
              assets,
              model: "gemini-2.5-flash",
              prompt: "Identify every visible Chinese text block and translate it into concise natural English.",
            })
          : null;

    for (const item of analysis?.items ?? []) {
      const replacements = item.blocks
        .map((block) => [block.source_text?.trim(), block.translated_text?.trim()] as const)
        .filter(([source, translated]) => source && translated);

      if (!replacements.length) {
        continue;
      }

      const replacementList = Array.from(
        new Map(
          replacements.map(([source, translated]) => [`${source}=>${translated}`, { source, translated }]),
        ).values(),
      )
        .map(({ source, translated }) => `- "${source}" -> "${translated}"`)
        .join("\n");

      prompts.set(
        item.asset.id,
        [
          fallbackPrompt,
          "Use these exact text replacements for this image:",
          replacementList,
          "If a Chinese text block appears multiple times, translate all of them consistently.",
          "Preserve approximate text placement and visual hierarchy from the original image.",
        ].join("\n"),
      );
    }
  } catch {
    return prompts;
  }

  return prompts;
}

function summarize(jobItems: JobItem[], paused = false, autoRetryFailedItems = true) {
  const successCount = jobItems.filter((item) => item.status === "succeeded").length;
  const terminalFailedCount = jobItems.filter((item) => item.status === "failed").length;
  const unresolvedFailedCount = jobItems.filter(
    (item) => (item.failedAttemptCount ?? 0) > 0 && item.status !== "succeeded",
  ).length;
  const failedCount = autoRetryFailedItems ? unresolvedFailedCount : terminalFailedCount;
  const pendingCount = jobItems.filter((item) => item.status === "pending").length;
  const runningCount = jobItems.filter((item) => item.status === "running").length;
  const completedCount = successCount + terminalFailedCount;
  const totalCount = Math.max(1, jobItems.length);
  const unfinishedCount = Math.max(0, jobItems.length - completedCount);
  const progress = Math.round((completedCount / totalCount) * 100);

  let status = "running";
  let statusTone: StatusTone = "blue";

  if (paused) {
    status = "paused";
    statusTone = "amber";
  } else if (completedCount === totalCount) {
    if (terminalFailedCount === 0) {
      status = "succeeded";
      statusTone = "green";
    } else if (successCount === 0) {
      status = "failed";
      statusTone = "red";
    } else {
      status = "partial";
      statusTone = "amber";
    }
  } else if (runningCount === 0) {
    status = "queued";
    statusTone = "amber";
  }

  return {
    successCount,
    failedCount,
    unfinishedCount,
    pendingCount,
    runningCount,
    progress,
    status,
    statusTone,
    outputCount: successCount,
  };
}

function refreshJobSummary(jobId: string, extraUpdates?: Partial<Job>) {
  const current = getJobById(jobId);
  if (!current) {
    return undefined;
  }

  return updateJob(jobId, {
    ...summarize(current.jobItems ?? [], Boolean(current.pausedAt), current.autoRetryFailedItems !== false),
    ...extraUpdates,
  });
}

function getRecoverableRunningItemStatus(job: Job) {
  return job.autoRetryFailedItems === false ? "failed" : "pending";
}

function markJobItem(jobId: string, assetId: string, updates: Partial<JobItem>) {
  updateJobItems(jobId, (items) =>
    items.map((item) => (item.assetId === assetId ? { ...item, ...updates } : item)),
  );
  return refreshJobSummary(jobId);
}

function markAttemptStarted(jobId: string, assetId: string) {
  const now = nowIso();
  const current = getJobById(jobId);
  updateJob(jobId, {
    totalCallCount: (current?.totalCallCount ?? 0) + 1,
  });
  updateJobItems(jobId, (items) =>
    items.map((item) =>
      item.assetId === assetId
        ? {
            ...item,
            attemptCount: (item.attemptCount ?? 0) + 1,
            lastAttemptAt: now,
          }
        : item,
    ),
  );
}

function incrementJobCounter(jobId: string, key: "successfulCallCount" | "failedCallCount") {
  const current = getJobById(jobId);
  updateJob(jobId, {
    [key]: (current?.[key] ?? 0) + 1,
  });
}

function shouldPauseJob(jobId: string) {
  return Boolean(getJobById(jobId)?.pausedAt);
}

function finishOrContinueJob(jobId: string) {
  const current = getJobById(jobId);
  if (!current) {
    return undefined;
  }

  const summary = summarize(current.jobItems ?? [], Boolean(current.pausedAt), current.autoRetryFailedItems !== false);
  const hasOpenItems = summary.pendingCount > 0 || summary.runningCount > 0;
  return updateJob(jobId, {
    ...summary,
    finishedAt: hasOpenItems || current.pausedAt ? undefined : nowIso(),
  });
}

function queueFailedItemsForNextAutoRetryRound(jobId: string) {
  const job = getJobById(jobId);
  if (!job || job.pausedAt || job.autoRetryFailedItems === false) {
    return false;
  }

  if ((job.jobItems ?? []).some((item) => item.status === "running")) {
    return false;
  }

  let queuedCount = 0;
  updateJobItems(jobId, (items) =>
    items.map((item) => {
      if (
        item.status !== "failed" ||
        item.outputAssetId ||
        (item.failedAttemptCount ?? 0) >= MAX_AUTO_RETRY_FAILED_ATTEMPTS
      ) {
        return item;
      }

      queuedCount += 1;
      return {
        ...item,
        status: "pending",
        startedAt: undefined,
        finishedAt: undefined,
      };
    }),
  );

  if (queuedCount === 0) {
    return false;
  }

  refreshJobSummary(jobId);
  return true;
}

async function persistOutput(job: Job, asset: Asset, output: {
  name: string;
  previewUrl: string;
  dimensions: string;
  tags: string[];
  bytes?: Buffer;
}) {
  const outputDir = path.join(process.cwd(), "public", "outputs");
  const storedRelativePath = path.posix.join(job.id, output.name);
  const storedFilePath = path.join(outputDir, ...storedRelativePath.split("/"));
  await mkdir(path.dirname(storedFilePath), { recursive: true });

  if ("bytes" in output && output.bytes) {
    await writeFile(storedFilePath, output.bytes);
  }

  const persisted = createAsset({
    name: output.name,
    kind: pathExtToKind(output.name),
    dimensions: output.dimensions,
    tags: output.tags,
    previewUrl: `/outputs/${storedRelativePath}`,
    source: `job:${job.id}`,
    relativePath: buildOutputRelativePath(asset, output.name),
    sourceAssetId: asset.id,
  });

  console.info(
    `[image-generation:succeeded] jobId=${job.id} sourceAssetId=${asset.id} sourceAsset="${asset.name}" outputAssetId=${persisted.id} output="${output.name}" previewUrl="${persisted.previewUrl}"`,
  );

  return persisted;
}

async function runTranslationOverlay(job: Job, asset: Asset) {
  const analysis =
    job.providerModelFamily === "gemini"
      ? await runGeminiTranslationJob({
          assets: [asset],
          model: job.model ?? "gemini-2.5-flash",
          prompt: job.prompt ?? "",
        })
      : await runOpenAITranslationJob({
          assets: [asset],
          model: job.model ?? "gpt-4.1-mini",
          prompt: job.prompt ?? "",
        });

  const item = analysis.items[0];
  if (!item) {
    throw new Error("No translation analysis result returned for this image.");
  }

  const outputName = buildOutputName(asset, "translated", "png");
  const overlay = await renderTranslationOverlay({
    jobId: job.id,
    inputPath: path.join(process.cwd(), "public", asset.previewUrl!.replace(/^\//, "")),
    outputName,
    outputRelativePath: path.posix.join(job.id, outputName),
    blocks: item.blocks,
  });

  const itemMeta = item as typeof item & { endpointUsed?: string; attemptLog?: string[] };
  return {
    ...overlay,
    endpointUsed: itemMeta.endpointUsed,
    attemptLog: itemMeta.attemptLog,
  };
}

function toJobItemMeta(output: unknown) {
  const meta = output && typeof output === "object" ? output as { endpointUsed?: unknown; attemptLog?: unknown } : {};
  return {
    endpointUsed: typeof meta.endpointUsed === "string" ? meta.endpointUsed : undefined,
    attemptLog: Array.isArray(meta.attemptLog) ? meta.attemptLog.filter((entry) => typeof entry === "string") : undefined,
  };
}

async function processSingleAsset(job: Job, asset: Asset) {
  if (job.taskType === "translate-zh-en") {
    return runTranslationOverlay(job, asset);
  }

  if (job.taskType === "redraw-translate-zh-en") {
    const prompt = createBaseRedrawPrompt(job.prompt ?? "");

    if (job.providerModelFamily === "qwen-local") {
      const result = await runQwenImageEditJob({
        assets: [asset],
        prompt,
        model: job.model ?? "Qwen/Qwen-Image-Edit-2511",
      });
      return result.outputs[0];
    }

    if (job.providerModelFamily === "dashscope") {
      const result = await runDashScopeImageJob({
        assets: [asset],
        prompt,
        model: job.model ?? "wan2.7-image-pro",
        size: job.size ?? "auto",
      });
      return result.outputs[0];
    }

    if (job.provider === "openai") {
      const result = await runOpenAIImageJob({
        assets: [asset],
        prompt: createStableOpenAIImagePrompt(prompt),
        model: job.model ?? "gpt-image-2",
        quality: job.quality ?? "high",
        size: job.size ?? "auto",
      });
      return result.outputs[0];
    }
  }

  const result = await runLocalImageJob({
    jobId: job.id,
    preset: job.preset ?? "commerce-enhance",
    assets: [asset],
  });
  return result.outputs[0];
}

async function runJobNow(jobId: string, slotId: number) {
  const heartbeatTimer = setInterval(() => {
    touchJobHeartbeat(jobId, slotId);
  }, 15_000);

  try {
    const job = reconcileJobOutputState(jobId) ?? getJobById(jobId);
    if (!job) {
      return;
    }

    if (job.pausedAt) {
      refreshJobSummary(job.id);
      return;
    }

    const jobItems = job.jobItems ?? [];
    const targetAssetIds = jobItems
      .filter((item) => item.status === "pending")
      .map((item) => item.assetId);
    const assets = getAssetsByIds(targetAssetIds).filter((asset) => asset.previewUrl);

    if (jobItems.length === 0) {
      updateJob(job.id, {
        status: "failed",
        statusTone: "red",
        progress: 100,
        pendingCount: 0,
        runningCount: 0,
        failedCount: job.itemCount,
        unfinishedCount: job.itemCount,
        finishedAt: nowIso(),
      });
      return;
    }

    if (assets.length === 0) {
      refreshJobSummary(job.id, { finishedAt: nowIso() });
      return;
    }

    if (!touchJobHeartbeat(job.id, slotId)) {
      recoverJobState(job.id);
      return;
    }
    updateJob(job.id, {
      status: "running",
      statusTone: "blue",
      startedAt: job.startedAt ?? nowIso(),
    });

    if (!touchJobHeartbeat(job.id, slotId)) {
      recoverJobState(job.id);
      return;
    }

    for (const asset of assets) {
      if (!touchJobHeartbeat(job.id, slotId)) {
        recoverJobState(job.id);
        return;
      }

      if (shouldPauseJob(job.id)) {
        refreshJobSummary(job.id);
        return;
      }

      const latestItems = getJobById(job.id)?.jobItems ?? [];
      if (latestItems.some((item) => item.status === "running" && item.assetId !== asset.id)) {
        refreshJobSummary(job.id);
        return;
      }

      const latestItem = latestItems.find((item) => item.assetId === asset.id);
      if (!latestItem || latestItem.status !== "pending" || latestItem.outputAssetId) {
        refreshJobSummary(job.id);
        continue;
      }

      if (!touchJobHeartbeat(job.id, slotId)) {
        recoverJobState(job.id);
        return;
      }
      markJobItem(job.id, asset.id, {
        status: "running",
        error: undefined,
        endpointUsed: undefined,
        attemptLog: undefined,
        startedAt: nowIso(),
      });
      markAttemptStarted(job.id, asset.id);

      try {
        const output = await processSingleAsset(job, asset);
        if (!output) {
          throw new Error("No output returned for this image.");
        }

        const persisted = await persistOutput(job, asset, output);
        incrementJobCounter(job.id, "successfulCallCount");
        if (!touchJobHeartbeat(job.id, slotId)) {
          recoverJobState(job.id);
          return;
        }
        markJobItem(job.id, asset.id, {
          status: "succeeded",
          outputAssetId: persisted.id,
          error: undefined,
          ...toJobItemMeta(output),
          finishedAt: nowIso(),
        });
      } catch (error) {
        incrementJobCounter(job.id, "failedCallCount");
        if (!touchJobHeartbeat(job.id, slotId)) {
          recoverJobState(job.id);
          return;
        }
        updateJobItems(job.id, (items) =>
          items.map((item) =>
            item.assetId === asset.id
              ? item.status === "succeeded" || item.outputAssetId
                ? {
                    ...item,
                    status: "succeeded",
                    error: undefined,
                    finishedAt: item.finishedAt ?? nowIso(),
                  }
                : {
                    ...item,
                    status: "failed",
                    error: error instanceof Error ? error.message : "Job execution failed for this image.",
                    attemptLog: error instanceof Error ? error.message.split(" | ") : ["Job execution failed for this image."],
                    failedAttemptCount: (item.failedAttemptCount ?? 0) + 1,
                    finishedAt: nowIso(),
                  }
              : item,
          ),
        );
        refreshJobSummary(job.id);
      }
    }

    queueFailedItemsForNextAutoRetryRound(job.id);
    finishOrContinueJob(job.id);
  } finally {
    clearInterval(heartbeatTimer);
    releaseJobSlot(jobId, slotId);
    void scheduleJobs();
  }
}

function getRunningJobIdsFromSlots() {
  const jobIds = new Set<string>();
  ensureLocksDir();

  for (const slotId of getKnownSlotIds()) {
    cleanupStaleSlot(slotId);
    const lock = parseSlotLock(slotId);
    if (lock && isFreshHeartbeat(lock.heartbeatAt)) {
      jobIds.add(lock.jobId);
    }
  }

  return jobIds;
}

function hasSchedulablePendingWork() {
  const assignedJobIds = getRunningJobIdsFromSlots();
  return listJobs().some((job) => {
    if (job.pausedAt || job.status === "paused" || assignedJobIds.has(job.id)) {
      return false;
    }

    const hasPendingItems = (job.jobItems ?? []).some((item) => item.status === "pending");
    if (!hasPendingItems) {
      return false;
    }

    return job.status === "queued" || job.status === "running" || job.status === "partial" || job.status === "failed";
  });
}

function startJobRunnerIdlePoll() {
  if (runnerIdlePollTimer) {
    return;
  }

  runnerIdlePollTimer = setInterval(() => {
    if (hasSchedulablePendingWork()) {
      void scheduleJobs();
    }
  }, RUNNER_IDLE_POLL_INTERVAL_MS);
  runnerIdlePollTimer.unref?.();
}

export function isJobScheduled(jobId: string) {
  return getRunningJobIdsFromSlots().has(jobId);
}

export function recoverJobState(jobId: string) {
  if (isJobScheduled(jobId)) {
    return getJobById(jobId);
  }

  const job = reconcileJobOutputState(jobId) ?? getJobById(jobId);
  if (!job) {
    return undefined;
  }

  const jobItems = job.jobItems ?? [];
  const hasInterruptedWork = jobItems.some((item) => item.status === "running");
  if (!hasInterruptedWork) {
    updateJob(jobId, {
      runnerWorkerId: undefined,
      runnerSlotId: undefined,
      heartbeatAt: undefined,
    });
    return refreshJobSummary(jobId);
  }

  const recoveredItemStatus = getRecoverableRunningItemStatus(job);
  updateJobItems(jobId, (items) =>
    items.map((item) =>
      item.status === "running"
        ? {
            ...item,
            status: recoveredItemStatus,
            error: item.error ?? "Interrupted before completion.",
            finishedAt: recoveredItemStatus === "failed" ? (item.finishedAt ?? nowIso()) : undefined,
          }
        : item,
    ),
  );

  const hasRetryableWork = recoveredItemStatus === "pending";
  return refreshJobSummary(jobId, {
    finishedAt: hasRetryableWork ? undefined : nowIso(),
    runnerWorkerId: undefined,
    runnerSlotId: undefined,
    heartbeatAt: undefined,
  });
}

export function recoverInterruptedJobs() {
  const jobs = listJobs();
  const recoveredJobIds: string[] = [];

  for (const job of jobs) {
    if (isJobScheduled(job.id)) {
      continue;
    }

    const hasInterruptedWork = (job.jobItems ?? []).some((item) => item.status === "running");
    const hasStaleRunningJobState =
      job.status === "running" ||
      Boolean(job.runnerSlotId) ||
      Boolean(job.runnerWorkerId) ||
      Boolean(job.heartbeatAt);

    if (!hasInterruptedWork && !hasStaleRunningJobState) {
      continue;
    }

    const recovered = recoverJobState(job.id);
    if (recovered) {
      recoveredJobIds.push(job.id);
    }
  }

  return recoveredJobIds;
}

export async function scheduleJobs() {
  startJobRunnerIdlePoll();

  if (scheduling) {
    scheduleRequested = true;
    return;
  }

  scheduling = true;
  await deferToNextTick();
  const hasSchedulerLock = acquireSchedulerLock();

  try {
    if (!hasSchedulerLock) {
      return;
    }

    recoverInterruptedJobs();
    for (const job of listJobs()) {
      if ((job.status === "partial" || job.status === "failed") && !isJobScheduled(job.id)) {
        queueFailedItemsForNextAutoRetryRound(job.id);
      }
    }

    const assignedJobIds = getRunningJobIdsFromSlots();
    while (true) {
      const jobs = listJobs();
      const candidate = jobs.find((job) => {
        if (job.pausedAt || job.status === "paused") {
          return false;
        }

        const jobItems = job.jobItems ?? [];
        const hasPendingItems = jobItems.some((item) => item.status === "pending");
        if (!hasPendingItems) {
          return false;
        }

        if (assignedJobIds.has(job.id)) {
          return false;
        }

        return job.status === "queued" || job.status === "running" || job.status === "partial" || job.status === "failed";
      });

      if (!candidate) {
        return;
      }

      const slotId = acquireSlot(candidate.id);
      if (!slotId) {
        return;
      }
      assignedJobIds.add(candidate.id);

      updateJob(candidate.id, {
        status: "running",
        statusTone: "blue",
        startedAt: candidate.startedAt ?? nowIso(),
        runnerWorkerId: schedulerWorkerId,
        runnerSlotId: slotId,
        heartbeatAt: nowIso(),
      });

      void runJobNow(candidate.id, slotId);
    }
  } finally {
    if (hasSchedulerLock) {
      releaseSchedulerLock();
    }
    scheduling = false;
    if (scheduleRequested) {
      scheduleRequested = false;
      setTimeout(() => {
        void scheduleJobs();
      }, 0);
    }
  }
}

export async function ensureJobRunnerAwake() {
  startJobRunnerIdlePoll();

  const now = Date.now();
  if (scheduling) {
    scheduleRequested = true;
    return;
  }

  if (now - lastRunnerWakeAt < RUNNER_WAKE_INTERVAL_MS) {
    return;
  }

  lastRunnerWakeAt = now;
  setTimeout(() => {
    void scheduleJobs();
  }, 0);
}

export function executeJob(jobId: string) {
  const job = reconcileJobOutputState(jobId) ?? getJobById(jobId);
  if (!job) {
    return;
  }

  updateJob(jobId, {
    status: "queued",
    statusTone: "amber",
    finishedAt: undefined,
  });

  void scheduleJobs();
}

startJobRunnerIdlePoll();
