import { NextResponse } from "next/server";
import { readProviderSecrets, saveProviderSecrets } from "@/lib/provider-secrets";

export function GET() {
  const secrets = readProviderSecrets();
  return NextResponse.json({
    openaiApiKey: "",
    openaiApiKeyConfigured: Boolean(secrets.openaiApiKey),
    openaiBaseUrl: secrets.openaiBaseUrl || "https://api.openai.com/v1",
    openaiFallbackApiKey: "",
    openaiFallbackApiKeyConfigured: Boolean(secrets.openaiFallbackApiKey),
    openaiFallbackBaseUrl: secrets.openaiFallbackBaseUrl || "",
    geminiApiKey: "",
    geminiApiKeyConfigured: Boolean(secrets.geminiApiKey),
    dashscopeApiKey: "",
    dashscopeApiKeyConfigured: Boolean(secrets.dashscopeApiKey),
    ollamaBaseUrl: secrets.ollamaBaseUrl || "http://127.0.0.1:11434",
    ollamaVisionModel: secrets.ollamaVisionModel || "",
    qwenImageWorkerUrl: secrets.qwenImageWorkerUrl || "http://127.0.0.1:8012",
    jobRunnerMaxParallelJobs: Math.max(1, Number(secrets.jobRunnerMaxParallelJobs ?? 10) || 10),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    openaiFallbackApiKey?: string;
    openaiFallbackBaseUrl?: string;
    geminiApiKey?: string;
    dashscopeApiKey?: string;
    ollamaBaseUrl?: string;
    ollamaVisionModel?: string;
    qwenImageWorkerUrl?: string;
    jobRunnerMaxParallelJobs?: number | string;
  };

  const current = readProviderSecrets();
  const keepExisting = (value: string | undefined, currentValue: string) => {
    const normalized = String(value ?? "").trim();
    if (!normalized || normalized === "configured") {
      return currentValue;
    }
    return normalized;
  };

  saveProviderSecrets({
    openaiApiKey: keepExisting(body.openaiApiKey, current.openaiApiKey),
    openaiBaseUrl: body.openaiBaseUrl ?? "https://api.openai.com/v1",
    openaiFallbackApiKey: keepExisting(body.openaiFallbackApiKey, current.openaiFallbackApiKey),
    openaiFallbackBaseUrl: body.openaiFallbackBaseUrl ?? "",
    geminiApiKey: keepExisting(body.geminiApiKey, current.geminiApiKey),
    dashscopeApiKey: keepExisting(body.dashscopeApiKey, current.dashscopeApiKey),
    ollamaBaseUrl: body.ollamaBaseUrl ?? "http://127.0.0.1:11434",
    ollamaVisionModel: body.ollamaVisionModel ?? "",
    qwenImageWorkerUrl: body.qwenImageWorkerUrl ?? "http://127.0.0.1:8012",
    jobRunnerMaxParallelJobs: Math.max(1, Number.parseInt(String(body.jobRunnerMaxParallelJobs ?? current.jobRunnerMaxParallelJobs ?? 10), 10) || 10),
  });

  return NextResponse.json({ ok: true });
}
