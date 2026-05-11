export type StatusTone = "green" | "amber" | "blue" | "red";

export type DashboardMetric = {
  label: string;
  title: string;
  value: string;
  description: string;
  trend: string;
};

export type QueueLane = {
  name: string;
  description: string;
  waiting: number;
  running: number;
  sla: string;
};

export type Job = {
  id: string;
  name: string;
  workflowName: string;
  itemCount: number;
  progress: number;
  status: string;
  statusTone: StatusTone;
  routingPolicy: string;
  assetIds?: string[];
  preset?: string;
  outputCount?: number;
  provider?: "openai" | "local";
  taskType?: "redraw-translate-zh-en" | "translate-zh-en" | "creative-edit";
  providerModelFamily?: "openai" | "gemini" | "dashscope" | "ollama" | "qwen-local" | "local";
  model?: string;
  prompt?: string;
  quality?: string;
  size?: string;
};

export type Workflow = {
  id: string;
  name: string;
  version: number;
  trigger: string;
  summary: string;
  steps: string[];
};

export type ModelDefinition = {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  status: "active" | "limited";
  pricing: string;
  latency: string;
};

export type Asset = {
  id: string;
  name: string;
  kind: string;
  dimensions: string;
  status: string;
  statusTone: StatusTone;
  tags: string[];
  previewUrl?: string;
  source?: string;
  batchId?: string;
  batchLabel?: string;
  uploadedAt?: string;
};

export type IngestionChannel = {
  name: string;
  description: string;
  mode: string;
};

export type RoutingPolicy = {
  name: string;
  description: string;
};
