import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type ProviderSecrets = {
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiFallbackApiKey: string;
  openaiFallbackBaseUrl: string;
  geminiApiKey: string;
  dashscopeApiKey: string;
  ollamaBaseUrl: string;
  ollamaVisionModel: string;
  qwenImageWorkerUrl: string;
  jobRunnerMaxParallelJobs: number;
};

const dataDir = path.join(process.cwd(), "data");
const secretsFile = path.join(dataDir, "provider-secrets.json");

const defaultSecrets: ProviderSecrets = {
  openaiApiKey: "",
  openaiBaseUrl: "",
  openaiFallbackApiKey: "",
  openaiFallbackBaseUrl: "",
  geminiApiKey: "",
  dashscopeApiKey: "",
  ollamaBaseUrl: "",
  ollamaVisionModel: "",
  qwenImageWorkerUrl: "",
  jobRunnerMaxParallelJobs: 10,
};

function ensureSecretsFile() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  if (!existsSync(secretsFile)) {
    writeFileSync(secretsFile, JSON.stringify(defaultSecrets, null, 2), "utf8");
  }
}

export function readProviderSecrets() {
  ensureSecretsFile();
  return JSON.parse(readFileSync(secretsFile, "utf8")) as ProviderSecrets;
}

export function saveProviderSecrets(input: Partial<ProviderSecrets>) {
  const current = readProviderSecrets();
  const next = { ...current, ...input };
  writeFileSync(secretsFile, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function getProviderSecret(provider: "openai" | "gemini" | "dashscope") {
  const local = readProviderSecrets();

  if (provider === "openai") {
    return process.env.OPENAI_API_KEY || local.openaiApiKey || "";
  }

  if (provider === "gemini") {
    return process.env.GEMINI_API_KEY || local.geminiApiKey || "";
  }

  return process.env.DASHSCOPE_API_KEY || local.dashscopeApiKey || "";
}

export function getOpenAIBaseUrl() {
  const local = readProviderSecrets();
  return process.env.OPENAI_BASE_URL || local.openaiBaseUrl || "https://api.openai.com/v1";
}

export function getOpenAIEndpoints() {
  const local = readProviderSecrets();

  const primaryApiKey = process.env.OPENAI_API_KEY || local.openaiApiKey || "";
  const primaryBaseUrl = process.env.OPENAI_BASE_URL || local.openaiBaseUrl || "https://api.openai.com/v1";
  const fallbackApiKey = process.env.OPENAI_FALLBACK_API_KEY || local.openaiFallbackApiKey || "";
  const fallbackBaseUrl = process.env.OPENAI_FALLBACK_BASE_URL || local.openaiFallbackBaseUrl || "";

  const endpoints = [
    primaryApiKey
      ? {
          label: "primary",
          apiKey: primaryApiKey,
          baseUrl: primaryBaseUrl.replace(/\/$/, ""),
        }
      : null,
    fallbackApiKey && fallbackBaseUrl
      ? {
          label: "fallback",
          apiKey: fallbackApiKey,
          baseUrl: fallbackBaseUrl.replace(/\/$/, ""),
        }
      : null,
  ].filter(Boolean) as Array<{
    label: "primary" | "fallback";
    apiKey: string;
    baseUrl: string;
  }>;

  return endpoints.filter(
    (endpoint, index, list) =>
      list.findIndex((candidate) => candidate.apiKey === endpoint.apiKey && candidate.baseUrl === endpoint.baseUrl) === index,
  );
}

export function getOllamaConfig() {
  const local = readProviderSecrets();

  return {
    baseUrl: process.env.OLLAMA_BASE_URL || local.ollamaBaseUrl || "http://127.0.0.1:11434",
    visionModel: process.env.OLLAMA_VISION_MODEL || local.ollamaVisionModel || "",
  };
}

export function getQwenImageWorkerUrl() {
  const local = readProviderSecrets();
  return process.env.QWEN_IMAGE_WORKER_URL || local.qwenImageWorkerUrl || "http://127.0.0.1:8012";
}

export function getJobRunnerMaxParallelJobs() {
  const local = readProviderSecrets();
  const raw = process.env.JOB_RUNNER_MAX_PARALLEL_JOBS ?? `${local.jobRunnerMaxParallelJobs ?? 10}`;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 10;
}
