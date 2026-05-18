import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Asset } from "@/lib/platform-types";
import { buildOutputName } from "@/lib/output-naming";
import { getQwenImageWorkerUrl } from "@/lib/provider-secrets";

type RunInput = {
  assets: Asset[];
  prompt: string;
  model: string;
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

function toBaseUrl(input: string) {
  return input.replace(/\/+$/, "");
}

export async function runQwenImageEditJob({
  assets,
  prompt,
  model,
}: RunInput): Promise<RunResult> {
  const workerUrl = getQwenImageWorkerUrl();
  const outputs: RunResult["outputs"] = [];

  for (const asset of assets) {
    if (!asset.previewUrl) {
      continue;
    }

    const inputPath = path.join(process.cwd(), "public", asset.previewUrl.replace(/^\//, ""));
    const bytes = await readFile(inputPath);

    const response = await fetch(`${toBaseUrl(workerUrl)}/edit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        image_base64: bytes.toString("base64"),
        filename: asset.name,
      }),
    });

    const result = (await response.json()) as {
      error?: string;
      image_base64?: string;
      width?: number;
      height?: number;
      format?: string;
    };

    if (!response.ok || !result.image_base64) {
      throw new Error(result.error ?? "Qwen local image edit failed.");
    }

    const ext = (result.format ?? "png").replace(/^\./, "").toLowerCase();
    const outputName = buildOutputName(asset, "translated", ext);

    outputs.push({
      name: outputName,
      previewUrl: `/outputs/${outputName}`,
      dimensions:
        result.width && result.height
          ? `${result.width} x ${result.height}`
          : asset.dimensions || "自动",
      tags: ["result", "qwen-local", model],
      bytes: Buffer.from(result.image_base64, "base64"),
    });
  }

  return { outputs };
}
