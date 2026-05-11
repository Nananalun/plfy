import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type ProviderSecrets = {
  openaiApiKey: string;
  geminiApiKey: string;
  dashscopeApiKey: string;
  ollamaBaseUrl: string;
  ollamaVisionModel: string;
  qwenImageWorkerUrl: string;
};

const dataDir = path.join(process.cwd(), "data");
const secretsFile = path.join(dataDir, "provider-secrets.json");

const defaultSecrets: ProviderSecrets = {
  openaiApiKey: "",
  geminiApiKey: "",
  dashscopeApiKey: "",
  ollamaBaseUrl: "",
  ollamaVisionModel: "",
  qwenImageWorkerUrl: "",
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
