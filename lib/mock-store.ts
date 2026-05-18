import { randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Asset, Job, JobItem, ModelDefinition, Workflow } from "@/lib/platform-types";
import {
  getAssets,
  getJobs,
  getModels,
  getRoutingPolicies,
  getWorkflowDslExample,
  getWorkflows,
} from "@/lib/platform-data";

type JobInput = {
  name: string;
  workflowName: string;
  itemCount: number;
  routingPolicy: string;
  assetIds?: string[];
  preset?: string;
  provider?: "openai" | "local";
  taskType?: "redraw-translate-zh-en" | "translate-zh-en" | "creative-edit";
  providerModelFamily?: "openai" | "gemini" | "dashscope" | "ollama" | "qwen-local" | "local";
  model?: string;
  prompt?: string;
  quality?: string;
  size?: string;
  autoRetryFailedItems?: boolean;
  jobItems?: JobItem[];
};

type WorkflowInput = {
  name: string;
  trigger: string;
  summary: string;
  steps: string[];
};

type RoutePreviewInput = {
  capability: string;
  priority: string;
  itemCount: number;
};

type AssetInput = {
  name: string;
  kind: string;
  dimensions: string;
  tags: string[];
  previewUrl?: string;
  source?: string;
  batchId?: string;
  batchLabel?: string;
  uploadedAt?: string;
  relativePath?: string;
  sourceAssetId?: string;
};

type StoreShape = {
  jobs: Job[];
  workflows: Workflow[];
  assets: Asset[];
};

const dataDir = path.join(process.cwd(), "data");
const storeFile = path.join(dataDir, "frameflow-store.json");
const backupStoreFile = path.join(dataDir, "frameflow-store.backup.json");
const tempStoreFile = path.join(dataDir, "frameflow-store.tmp.json");
const writeLockFile = path.join(dataDir, "frameflow-store.write.lock");
const outputsDir = path.join(process.cwd(), "public", "outputs");
const WRITE_LOCK_TIMEOUT_MS = 10_000;
const WRITE_LOCK_RETRY_MS = 25;
const ATOMIC_RENAME_RETRY_MS = 50;
const ATOMIC_RENAME_MAX_ATTEMPTS = 8;

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function acquireWriteLock() {
  ensureStoreFile();
  const startedAt = Date.now();

  while (true) {
    try {
      writeFileSync(writeLockFile, String(process.pid), {
        encoding: "utf8",
        flag: "wx",
      });
      return;
    } catch {
      if (Date.now() - startedAt > WRITE_LOCK_TIMEOUT_MS) {
        if (existsSync(writeLockFile)) {
          rmSync(writeLockFile, { force: true });
          continue;
        }
        throw new Error("Timed out waiting for frameflow store write lock.");
      }

      sleepSync(WRITE_LOCK_RETRY_MS);
    }
  }
}

function releaseWriteLock() {
  if (existsSync(writeLockFile)) {
    rmSync(writeLockFile, { force: true });
  }
}

function getSeedStore(): StoreShape {
  return {
    jobs: [...getJobs()],
    workflows: [...getWorkflows()],
    assets: [...getAssets()],
  };
}

function serializeStore(store: StoreShape) {
  return JSON.stringify(store, null, 2);
}

function parseStoreFile(filePath: string) {
  return JSON.parse(readFileSync(filePath, "utf8")) as StoreShape;
}

function listFilesRecursive(baseDir: string) {
  const files: string[] = [];
  const stack = [""];

  while (stack.length) {
    const relativeDir = stack.pop() ?? "";
    const absoluteDir = path.join(baseDir, relativeDir);

    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      const relativePath = relativeDir ? path.posix.join(relativeDir, entry.name) : entry.name;
      if (entry.isDirectory()) {
        stack.push(relativePath);
      } else {
        files.push(relativePath);
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function toRecoveredInputName(outputRelativePath: string) {
  const ext = path.extname(outputRelativePath);
  const base = outputRelativePath.slice(0, outputRelativePath.length - ext.length);

  if (base.endsWith("-translated")) {
    return `${base.slice(0, -"-translated".length)}${ext}`;
  }

  const translatedMatch = base.match(/^(.*)__translated-[^_]+__\d+$/);
  if (translatedMatch) {
    return `${translatedMatch[1]}${ext}`;
  }

  return `${base}${ext}`;
}

function buildRecoveredJob(jobId: string, files: string[], mtimeIso: string): Job {
  const jobItems: JobItem[] = files.map((relativePath, index) => ({
    assetId: `recovered-input-${jobId}-${index + 1}`,
    assetName: path.basename(toRecoveredInputName(relativePath)),
    relativePath: toRecoveredInputName(relativePath),
    status: "succeeded",
    outputAssetId: `recovered-output-${jobId}-${index + 1}`,
    finishedAt: mtimeIso,
  }));

  return {
    id: jobId,
    name: `Recovered ${jobId}`,
    workflowName: "Recovered Outputs",
    itemCount: files.length,
    progress: 100,
    status: "recovered",
    statusTone: "green",
    routingPolicy: "recovered",
    assetIds: jobItems.map((item) => item.assetId),
    outputCount: files.length,
    provider: "openai",
    taskType: "redraw-translate-zh-en",
    providerModelFamily: "openai",
    model: "recovered",
    prompt: "Recovered from existing output files after store reset.",
    successCount: files.length,
    failedCount: 0,
    unfinishedCount: 0,
    pendingCount: 0,
    runningCount: 0,
    startedAt: mtimeIso,
    finishedAt: mtimeIso,
    jobItems,
  };
}

function buildRecoveredAssets(jobId: string, files: string[]): Asset[] {
  return files.map((relativePath, index) => ({
    id: `recovered-output-${jobId}-${index + 1}`,
    name: path.basename(relativePath),
    kind: path.extname(relativePath).replace(".", "").toUpperCase() || "PNG",
    dimensions: "Recovered output",
    status: "ready",
    statusTone: "green",
    tags: ["recovered-output"],
    previewUrl: `/outputs/${jobId}/${relativePath}`,
    source: `job:${jobId}`,
    uploadedAt: statSync(path.join(outputsDir, jobId, relativePath)).mtime.toISOString(),
    relativePath,
    sourceAssetId: `recovered-input-${jobId}-${index + 1}`,
  }));
}

function shouldRecoverFromOutputs(store: StoreShape) {
  if (!existsSync(outputsDir)) {
    return false;
  }

  const outputJobDirs = readdirSync(outputsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("job_"))
    .map((entry) => entry.name);

  if (outputJobDirs.length === 0) {
    return false;
  }

  const existingJobIds = new Set(store.jobs.map((job) => job.id));
  const hasMissingOutputJob = outputJobDirs.some((jobId) => !existingJobIds.has(jobId));
  const nonRecoveredJobs = store.jobs.filter((job) => !job.name.startsWith("Recovered "));
  const looksLikeSeedOnly =
    nonRecoveredJobs.length > 0 &&
    nonRecoveredJobs.every((job) => /^job_10\d{2,}$/.test(job.id)) &&
    outputJobDirs.length > nonRecoveredJobs.length;

  return looksLikeSeedOnly || hasMissingOutputJob;
}

function recoverStoreFromOutputs(existingStore: StoreShape) {
  const existingJobIds = new Set(existingStore.jobs.map((job) => job.id));
  const existingAssetKeys = new Set(
    existingStore.assets.map((asset) => `${asset.source ?? "upload"}::${asset.relativePath ?? asset.name}`),
  );
  const recoveredJobs: Job[] = [];
  const recoveredAssets: Asset[] = [];

  for (const entry of readdirSync(outputsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("job_")) {
      continue;
    }

    const jobId = entry.name;
    const jobDir = path.join(outputsDir, jobId);
    const files = listFilesRecursive(jobDir);
    if (!files.length) {
      continue;
    }

    const mtimeIso = statSync(jobDir).mtime.toISOString();
    if (!existingJobIds.has(jobId)) {
      recoveredJobs.push(buildRecoveredJob(jobId, files, mtimeIso));
    }
    recoveredAssets.push(
      ...buildRecoveredAssets(jobId, files).filter((asset) => {
        const assetKey = `${asset.source ?? "upload"}::${asset.relativePath ?? asset.name}`;
        return !existingAssetKeys.has(assetKey);
      }),
    );
  }

  recoveredJobs.sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""));

  return {
    jobs: [...recoveredJobs, ...existingStore.jobs],
    workflows: existingStore.workflows,
    assets: [...existingStore.assets, ...recoveredAssets],
  } satisfies StoreShape;
}

function ensureStoreFile() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  if (!existsSync(storeFile)) {
    const serialized = serializeStore(getSeedStore());
    writeJsonAtomic(storeFile, serialized);
  }

  if (!existsSync(backupStoreFile)) {
    const serialized = readFileSync(storeFile, "utf8");
    writeBackupBestEffort(serialized);
  }
}

function cloneStore(store: StoreShape): StoreShape {
  return JSON.parse(JSON.stringify(store)) as StoreShape;
}

function isRetryableFileError(error: unknown) {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "EPERM" || code === "EACCES" || code === "EBUSY";
}

function writeJsonAtomic(targetFile: string, snapshot: string) {
  const tempFile = `${targetFile}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(tempFile, snapshot, "utf8");

  for (let attempt = 1; attempt <= ATOMIC_RENAME_MAX_ATTEMPTS; attempt += 1) {
    try {
      renameSync(tempFile, targetFile);
      return;
    } catch (error) {
      if (!isRetryableFileError(error) || attempt === ATOMIC_RENAME_MAX_ATTEMPTS) {
        break;
      }

      sleepSync(ATOMIC_RENAME_RETRY_MS * attempt);
    }
  }

  try {
    copyFileSync(tempFile, targetFile);
  } finally {
    rmSync(tempFile, { force: true });
  }
}

function writeBackupBestEffort(snapshot: string) {
  try {
    writeJsonAtomic(backupStoreFile, snapshot);
  } catch {
    // The live store is authoritative; backup writes can be blocked briefly on Windows.
  }
}

function loadStore(): StoreShape {
  ensureStoreFile();
  const candidates = [storeFile, backupStoreFile, tempStoreFile];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }

    try {
      const store = parseStoreFile(candidate);
      if (!shouldRecoverFromOutputs(store)) {
        return store;
      }

      const normalizedStore = recoverStoreFromOutputs(store);
      const snapshot = serializeStore(normalizedStore);
      writeStore(normalizedStore);
      writeBackupBestEffort(snapshot);
      return normalizedStore;
    } catch {
      continue;
    }
  }

  const store = getSeedStore();
  const snapshot = serializeStore(store);
  writeJsonAtomic(storeFile, snapshot);
  writeBackupBestEffort(snapshot);
  return store;
}

function writeStore(store: StoreShape) {
  ensureStoreFile();
  const snapshot = serializeStore(store);
  acquireWriteLock();
  try {
    writeJsonAtomic(storeFile, snapshot);
    writeBackupBestEffort(snapshot);
  } finally {
    releaseWriteLock();
  }
}

function updateStore<T>(updater: (store: StoreShape) => T) {
  ensureStoreFile();
  acquireWriteLock();
  try {
    const store = parseStoreFile(storeFile);
    const result = updater(store);
    const snapshot = serializeStore(store);
    writeJsonAtomic(storeFile, snapshot);
    writeBackupBestEffort(snapshot);
    return result;
  } finally {
    releaseWriteLock();
  }
}

export function listJobs() {
  return cloneStore(loadStore()).jobs;
}

export function listRecentJobs(limit = 20) {
  return cloneStore({
    jobs: loadStore().jobs.slice(0, limit),
    workflows: [],
    assets: [],
  }).jobs;
}

export function getJobById(jobId: string) {
  const job = loadStore().jobs.find((entry) => entry.id === jobId);
  return job ? JSON.parse(JSON.stringify(job)) as Job : undefined;
}

export function listWorkflows() {
  return cloneStore(loadStore()).workflows;
}

export function listAssets() {
  return cloneStore(loadStore()).assets;
}

export function listUploadAssets() {
  return cloneStore({
    jobs: [],
    workflows: [],
    assets: loadStore().assets.filter((asset) => (asset.source ?? "").includes("browser-upload")),
  }).assets;
}

export function getResultAssetsByJobIds(jobIds: string[]) {
  const jobIdSet = new Set(jobIds);
  const seenKeys = new Set<string>();
  return cloneStore({
    jobs: [],
    workflows: [],
    assets: loadStore().assets.filter((asset) => {
      const source = asset.source ?? "";
      if (!source.startsWith("job:")) {
        return false;
      }

      const jobId = source.replace("job:", "");
      if (!jobIdSet.has(jobId)) {
        return false;
      }

      const dedupeKey = `${source}::${asset.relativePath ?? asset.name}`;
      if (seenKeys.has(dedupeKey)) {
        return false;
      }

      seenKeys.add(dedupeKey);
      return true;
    }),
  }).assets;
}

function getDedupedResultAssets(store: StoreShape, jobIds: string[]) {
  const jobIdSet = new Set(jobIds);
  const seenKeys = new Set<string>();

  return store.assets.filter((asset) => {
    const source = asset.source ?? "";
    if (!source.startsWith("job:")) {
      return false;
    }

    const jobId = source.replace("job:", "");
    if (!jobIdSet.has(jobId)) {
      return false;
    }

    const dedupeKey = `${source}::${asset.relativePath ?? asset.name}`;
    if (seenKeys.has(dedupeKey)) {
      return false;
    }

    seenKeys.add(dedupeKey);
    return true;
  });
}

export function getResultAssetSummariesByJobIds(jobIds: string[], sampleLimit = 1) {
  const summaries = new Map<string, { jobId: string; count: number; sampleAssets: Asset[] }>();
  for (const jobId of jobIds) {
    summaries.set(jobId, { jobId, count: 0, sampleAssets: [] });
  }

  const assets = getDedupedResultAssets(loadStore(), jobIds);
  for (const asset of assets) {
    const jobId = asset.source?.replace("job:", "");
    if (!jobId) {
      continue;
    }

    const summary = summaries.get(jobId);
    if (!summary) {
      continue;
    }

    summary.count += 1;
    if (summary.sampleAssets.length < sampleLimit) {
      summary.sampleAssets.push(JSON.parse(JSON.stringify(asset)) as Asset);
    }
  }

  return Array.from(summaries.values());
}

export function getResultAssetsByJobIdPage(jobId: string, page: number, pageSize: number) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(100, pageSize));
  const assets = getDedupedResultAssets(loadStore(), [jobId])
    .sort((a, b) => (a.relativePath || a.name).localeCompare(b.relativePath || b.name))
    .map((asset) => JSON.parse(JSON.stringify(asset)) as Asset);
  const totalCount = assets.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const resolvedPage = Math.min(safePage, totalPages);
  const startIndex = (resolvedPage - 1) * safePageSize;

  return {
    items: assets.slice(startIndex, startIndex + safePageSize),
    page: resolvedPage,
    pageSize: safePageSize,
    totalCount,
    totalPages,
  };
}

export function getAssetsBySource(source: string) {
  return cloneStore(loadStore()).assets.filter((asset) => asset.source === source);
}

export function getAssetsByBatchId(batchId: string) {
  return loadStore().assets
    .filter((asset) => asset.batchId === batchId)
    .map((asset) => JSON.parse(JSON.stringify(asset)) as Asset);
}

export function getAssetsByIds(assetIds: string[]) {
  const assetMap = new Map(loadStore().assets.map((asset) => [asset.id, asset]));
  return assetIds
    .map((id) => assetMap.get(id))
    .filter(Boolean)
    .map((asset) => JSON.parse(JSON.stringify(asset)) as Asset);
}

export function createJob(input: JobInput) {
  const job: Job = {
    id: `job_${randomUUID()}`,
    name: input.name,
    workflowName: input.workflowName,
    itemCount: input.itemCount,
    progress: 0,
    status: "queued",
    statusTone: "red",
    routingPolicy: input.routingPolicy,
    assetIds: input.assetIds ?? [],
    preset: input.preset,
    outputCount: 0,
    provider: input.provider ?? "local",
    taskType: input.taskType ?? "creative-edit",
    providerModelFamily: input.providerModelFamily ?? "local",
    model: input.model,
    prompt: input.prompt,
    quality: input.quality,
    size: input.size,
    successCount: 0,
    failedCount: 0,
    unfinishedCount: input.jobItems?.length ?? input.assetIds?.length ?? 0,
    pendingCount: input.jobItems?.length ?? input.assetIds?.length ?? 0,
    runningCount: 0,
    totalCallCount: 0,
    successfulCallCount: 0,
    failedCallCount: 0,
    autoRetryFailedItems: input.autoRetryFailedItems ?? true,
    startedAt: new Date().toISOString(),
    jobItems: input.jobItems ?? [],
  };

  updateStore((store) => {
    store.jobs = [job, ...store.jobs.filter((entry) => entry.id !== job.id)];
  });
  return job;
}

export function updateJob(jobId: string, updates: Partial<Job>) {
  return updateStore((store) => {
    store.jobs = store.jobs.map((job) => (job.id === jobId ? { ...job, ...updates } : job));
    const updated = store.jobs.find((job) => job.id === jobId);
    return updated ? JSON.parse(JSON.stringify(updated)) as Job : undefined;
  });
}

export function updateJobItems(jobId: string, updater: (items: JobItem[]) => JobItem[]) {
  return updateStore((store) => {
    store.jobs = store.jobs.map((job) =>
      job.id === jobId
        ? {
            ...job,
            jobItems: updater(job.jobItems ?? []),
          }
        : job,
    );
    const updated = store.jobs.find((job) => job.id === jobId);
    return updated ? JSON.parse(JSON.stringify(updated)) as Job : undefined;
  });
}

function summarizeJobItems(job: Job, jobItems: JobItem[]) {
  const successCount = jobItems.filter((item) => item.status === "succeeded").length;
  const terminalFailedCount = jobItems.filter((item) => item.status === "failed").length;
  const unresolvedFailedCount = jobItems.filter(
    (item) => (item.failedAttemptCount ?? 0) > 0 && item.status !== "succeeded",
  ).length;
  const failedCount = job.autoRetryFailedItems === false ? terminalFailedCount : unresolvedFailedCount;
  const pendingCount = jobItems.filter((item) => item.status === "pending").length;
  const runningCount = jobItems.filter((item) => item.status === "running").length;
  const completedCount = successCount + terminalFailedCount;
  const unfinishedCount = Math.max(0, jobItems.length - completedCount);
  const progress = Math.round((completedCount / Math.max(1, jobItems.length || job.itemCount)) * 100);

  let status = job.status;
  let statusTone = job.statusTone;
  if (job.pausedAt) {
    status = "paused";
    statusTone = "amber";
  } else if (unfinishedCount === 0 && jobItems.length > 0) {
    status = "succeeded";
    statusTone = "green";
  } else if (runningCount > 0) {
    status = "running";
    statusTone = "blue";
  } else if (pendingCount > 0) {
    status = "queued";
    statusTone = "amber";
  } else if (terminalFailedCount > 0) {
    status = successCount > 0 ? "partial" : "failed";
    statusTone = successCount > 0 ? "amber" : "red";
  }

  return {
    successCount,
    failedCount,
    unfinishedCount,
    pendingCount,
    runningCount,
    outputCount: successCount,
    progress,
    status,
    statusTone,
    finishedAt: unfinishedCount === 0 && !job.pausedAt ? (job.finishedAt ?? new Date().toISOString()) : undefined,
  } satisfies Partial<Job>;
}

export function reconcileJobOutputState(jobId: string) {
  return updateStore((store) => {
    const job = store.jobs.find((entry) => entry.id === jobId);
    if (!job?.jobItems?.length) {
      return job ? JSON.parse(JSON.stringify(job)) as Job : undefined;
    }

    const resultAssets = getDedupedResultAssets(store, [jobId]);
    const resultBySourceAssetId = new Map(
      resultAssets
        .filter((asset) => asset.sourceAssetId)
        .map((asset) => [asset.sourceAssetId!, asset]),
    );
    const resultAssetIds = new Set(resultAssets.map((asset) => asset.id));
    let changed = false;

    const jobItems = job.jobItems.map((item) => {
      const linkedOutput = item.outputAssetId ? resultAssetIds.has(item.outputAssetId) : false;
      const outputAsset = resultBySourceAssetId.get(item.assetId);
      if (!linkedOutput && !outputAsset) {
        return item;
      }

      if (item.status === "succeeded" && (item.outputAssetId || !outputAsset)) {
        return item;
      }

      changed = true;
      return {
        ...item,
        status: "succeeded" as const,
        outputAssetId: item.outputAssetId ?? outputAsset?.id,
        error: undefined,
        finishedAt: item.finishedAt ?? outputAsset?.uploadedAt ?? new Date().toISOString(),
      };
    });

    if (!changed) {
      return JSON.parse(JSON.stringify(job)) as Job;
    }

    const updatedJob = {
      ...job,
      jobItems,
      ...summarizeJobItems(job, jobItems),
    };
    store.jobs = store.jobs.map((entry) => (entry.id === jobId ? updatedJob : entry));
    return JSON.parse(JSON.stringify(updatedJob)) as Job;
  });
}

export function deleteJob(jobId: string) {
  return updateStore((store) => {
    const existing = store.jobs.find((job) => job.id === jobId);
    if (!existing) {
      return undefined;
    }

    store.jobs = store.jobs.filter((job) => job.id !== jobId);
    return JSON.parse(JSON.stringify(existing)) as Job;
  });
}

export function createWorkflow(input: WorkflowInput) {
  const store = loadStore();
  const workflow: Workflow = {
    id: `wf_${randomUUID()}`,
    name: input.name,
    version: 1,
    trigger: input.trigger,
    summary: input.summary,
    steps: input.steps,
  };

  store.workflows = [workflow, ...store.workflows];
  writeStore(store);
  return workflow;
}

export function createAsset(input: AssetInput) {
  return updateStore((store) => {
    const dedupeKey = `${input.source ?? "upload"}::${input.relativePath ?? input.name}`;
    const existingIndex = store.assets.findIndex((asset) => {
      const assetKey = `${asset.source ?? "upload"}::${asset.relativePath ?? asset.name}`;
      return assetKey === dedupeKey;
    });
    const asset: Asset = {
      id: existingIndex >= 0 ? store.assets[existingIndex].id : `asset_${randomUUID()}`,
      name: input.name,
      kind: input.kind,
      dimensions: input.dimensions,
      status: "ready",
      statusTone: "green",
      tags: input.tags,
      previewUrl: input.previewUrl,
      source: input.source ?? "upload",
      batchId: input.batchId,
      batchLabel: input.batchLabel,
      uploadedAt: input.uploadedAt ?? new Date().toISOString(),
      relativePath: input.relativePath,
      sourceAssetId: input.sourceAssetId,
    };

    if (existingIndex >= 0) {
      store.assets[existingIndex] = asset;
    } else {
      store.assets = [asset, ...store.assets];
    }
    return JSON.parse(JSON.stringify(asset)) as Asset;
  });
}

export function deleteAssetsBySource(source: string) {
  return updateStore((store) => {
    const removed = store.assets.filter((asset) => asset.source === source);
    if (!removed.length) {
      return [];
    }

    store.assets = store.assets.filter((asset) => asset.source !== source);
    return JSON.parse(JSON.stringify(removed)) as Asset[];
  });
}

export function getLatestUploadBatchId() {
  const browserUploads = cloneStore(loadStore()).assets
    .filter((asset) => asset.batchId && (asset.source ?? "").includes("browser-upload"))
    .sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));

  return browserUploads[0]?.batchId ?? "";
}

export function previewRoute(input: RoutePreviewInput) {
  const models = getModels().filter((model) => model.capabilities.includes(input.capability));
  const policies = getRoutingPolicies().map((item) => item.name);
  const selectedPriority = policies.includes(input.priority) ? input.priority : "cost-balanced";

  const primary =
    selectedPriority === "speed-first"
      ? models.toSorted((a, b) => a.latency.localeCompare(b.latency))[0]
      : selectedPriority === "quality-first"
        ? models.find((model) => model.name === "VisionForge Edit XL") ?? models[0]
        : selectedPriority === "human-in-loop"
          ? models.find((model) => model.name === "PosterFill Pro") ?? models[0]
          : models.find((model) => model.name === "RapidCut BG-2") ?? models[0];

  const fallback = models.find((model) => model.id !== primary?.id) ?? models[0];
  const batchMode = input.itemCount >= 500 ? "parallel-worker-lanes" : "single-batch";

  return {
    request: input,
    primaryModel: primary as ModelDefinition | undefined,
    fallbackModel: fallback as ModelDefinition | undefined,
    policy: selectedPriority,
    batchMode,
    sampleDsl: getWorkflowDslExample(),
  };
}
