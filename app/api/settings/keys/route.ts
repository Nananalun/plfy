import { NextResponse } from "next/server";
import { readProviderSecrets, saveProviderSecrets } from "@/lib/provider-secrets";

export function GET() {
  const secrets = readProviderSecrets();
  return NextResponse.json({
    openaiApiKey: secrets.openaiApiKey ? "已配置" : "",
    geminiApiKey: secrets.geminiApiKey ? "已配置" : "",
    dashscopeApiKey: secrets.dashscopeApiKey ? "已配置" : "",
    ollamaBaseUrl: secrets.ollamaBaseUrl || "http://127.0.0.1:11434",
    ollamaVisionModel: secrets.ollamaVisionModel || "",
    qwenImageWorkerUrl: secrets.qwenImageWorkerUrl || "http://127.0.0.1:8012",
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    openaiApiKey?: string;
    geminiApiKey?: string;
    dashscopeApiKey?: string;
    ollamaBaseUrl?: string;
    ollamaVisionModel?: string;
    qwenImageWorkerUrl?: string;
  };

  saveProviderSecrets({
    openaiApiKey: body.openaiApiKey ?? "",
    geminiApiKey: body.geminiApiKey ?? "",
    dashscopeApiKey: body.dashscopeApiKey ?? "",
    ollamaBaseUrl: body.ollamaBaseUrl ?? "http://127.0.0.1:11434",
    ollamaVisionModel: body.ollamaVisionModel ?? "",
    qwenImageWorkerUrl: body.qwenImageWorkerUrl ?? "http://127.0.0.1:8012",
  });

  return NextResponse.json({ ok: true });
}
