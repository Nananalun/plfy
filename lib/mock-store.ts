import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Asset, Job, ModelDefinition, Workflow } from "@/lib/platform-types";
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
};

type StoreShape = {
  jobs: Job[];
  workflows: Workflow[];
  assets: Asset[];
};

const dataDir = path.join(process.cwd(), "data");
const storeFile = path.join(dataDir, "frameflow-store.json");

function ensureStoreFile() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  if (!existsSync(storeFile)) {
    const seed: StoreShape = {
      jobs: [...getJobs()],
      workflows: [...getWorkflows()],
      assets: [...getAssets()],
    };
    writeFileSync(storeFile, JSON.stringify(seed, null, 2), "utf8");
  }
}

function readStore(): StoreShape {
  ensureStoreFile();
  return JSON.parse(readFileSync(storeFile, "utf8")) as StoreShape;
}

function writeStore(store: StoreShape) {
  ensureStoreFile();
  writeFileSync(storeFile, JSON.stringify(store, null, 2), "utf8");
}

export function listJobs() {
  return readStore().jobs;
}

export function getJobById(jobId: string) {
  return readStore().jobs.find((job) => job.id === jobId);
}

export function listWorkflows() {
  return readStore().workflows;
}

export function listAssets() {
  return readStore().assets;
}

export function getAssetsBySource(source: string) {
  return readStore().assets.filter((asset) => asset.source === source);
}

export function getAssetsByIds(assetIds: string[]) {
  const assetMap = new Map(readStore().assets.map((asset) => [asset.id, asset]));
  return assetIds.map((id) => assetMap.get(id)).filter(Boolean) as Asset[];
}

export function createJob(input: JobInput) {
  const store = readStore();
  const job: Job = {
    id: `job_${Date.now()}`,
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
  };

  store.jobs = [job, ...store.jobs];
  writeStore(store);
  return job;
}

export function updateJob(jobId: string, updates: Partial<Job>) {
  const store = readStore();
  store.jobs = store.jobs.map((job) => (job.id === jobId ? { ...job, ...updates } : job));
  writeStore(store);
  return store.jobs.find((job) => job.id === jobId);
}

export function deleteJob(jobId: string) {
  const store = readStore();
  const existing = store.jobs.find((job) => job.id === jobId);
  if (!existing) {
    return undefined;
  }

  store.jobs = store.jobs.filter((job) => job.id !== jobId);
  writeStore(store);
  return existing;
}

export function createWorkflow(input: WorkflowInput) {
  const store = readStore();
  const workflow: Workflow = {
    id: `wf_${Date.now()}`,
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
  const store = readStore();
  const asset: Asset = {
    id: `asset_${Date.now()}`,
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
  };

  store.assets = [asset, ...store.assets];
  writeStore(store);
  return asset;
}

export function deleteAssetsBySource(source: string) {
  const store = readStore();
  const removed = store.assets.filter((asset) => asset.source === source);
  if (!removed.length) {
    return [];
  }

  store.assets = store.assets.filter((asset) => asset.source !== source);
  writeStore(store);
  return removed;
}

export function getLatestUploadBatchId() {
  const browserUploads = readStore().assets
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
