import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Asset } from "@/lib/platform-types";
import { getProviderSecret } from "@/lib/provider-secrets";

type RunInput = {
  assets: Asset[];
  prompt: string;
  model: string;
  quality: string;
  size: string;
};

type RunResult = {
  outputs: Array<{
    name: string;
    previewUrl: string;
    dimensions: string;
    tags: string[];
    bytes: Buffer;
  }>;
};

function getMimeType(asset: Asset) {
  switch (asset.kind.toUpperCase()) {
    case "PNG":
      return "image/png";
    case "WEBP":
      return "image/webp";
    case "JPG":
    case "JPEG":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

export async function runOpenAIImageJob({
  assets,
  prompt,
  model,
  quality,
  size,
}: RunInput): Promise<RunResult> {
  const apiKey = getProviderSecret("openai");

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const outputs: RunResult["outputs"] = [];

  for (const asset of assets) {
    if (!asset.previewUrl) {
      continue;
    }

    const inputPath = path.join(process.cwd(), "public", asset.previewUrl.replace(/^\//, ""));
    const bytes = await readFile(inputPath);
    const formData = new FormData();
    const blob = new Blob([bytes], { type: getMimeType(asset) });

    formData.append("model", model);
    formData.append("prompt", prompt);
    if (size !== "auto") {
      formData.append("size", size);
    }
    formData.append("quality", quality);
    formData.append("image[]", blob, asset.name);

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const result = (await response.json()) as {
      error?: { message?: string };
      data?: Array<{ b64_json?: string }>;
    };

    if (!response.ok || !result.data?.[0]?.b64_json) {
      throw new Error(result.error?.message ?? "OpenAI image edit failed.");
    }

    const outputBytes = Buffer.from(result.data[0].b64_json, "base64");
    const outputName = `${Date.now()}-${asset.id}-openai.png`;

    outputs.push({
      name: outputName,
      previewUrl: `/outputs/${outputName}`,
      dimensions: size.replace("x", " x "),
      tags: ["result", "openai", model],
      bytes: outputBytes,
    });
  }

  return { outputs };
}
