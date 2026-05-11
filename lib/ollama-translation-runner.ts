import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Asset } from "@/lib/platform-types";
import type { TranslationBlock } from "@/lib/translation-overlay";
import { getOllamaConfig } from "@/lib/provider-secrets";

type RunInput = {
  assets: Asset[];
  model: string;
  prompt: string;
};

type RunResult = {
  items: Array<{
    asset: Asset;
    blocks: TranslationBlock[];
  }>;
};

function normalizeBlocks(value: unknown) {
  const candidate = value as { blocks?: TranslationBlock[] };
  return Array.isArray(candidate?.blocks) ? candidate.blocks : [];
}

function toBaseUrl(input: string) {
  return input.replace(/\/+$/, "");
}

export async function runOllamaTranslationJob({
  assets,
  model,
  prompt,
}: RunInput): Promise<RunResult> {
  const config = getOllamaConfig();
  const selectedModel = model || config.visionModel;

  if (!selectedModel) {
    throw new Error("Ollama 视觉模型未配置。");
  }

  const items: RunResult["items"] = [];

  for (const asset of assets) {
    if (!asset.previewUrl) {
      continue;
    }

    const inputPath = path.join(process.cwd(), "public", asset.previewUrl.replace(/^\//, ""));
    const bytes = await readFile(inputPath);

    const response = await fetch(`${toBaseUrl(config.baseUrl)}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        stream: false,
        format: {
          type: "object",
          properties: {
            blocks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  source_text: { type: "string" },
                  translated_text: { type: "string" },
                  box_2d: {
                    type: "array",
                    minItems: 4,
                    maxItems: 4,
                    items: { type: "number" },
                  },
                },
                required: ["source_text", "translated_text", "box_2d"],
              },
            },
          },
          required: ["blocks"],
        },
        messages: [
          {
            role: "user",
            content:
              `${prompt}\n` +
              "Return JSON only. Detect every visible Chinese text block in the image and translate it to natural English. " +
              "Use normalized coordinates from 0 to 1000 as [top,left,bottom,right]. " +
              'If there is no Chinese text, return {"blocks":[]}.',
            images: [bytes.toString("base64")],
          },
        ],
      }),
    });

    const result = (await response.json()) as {
      error?: string;
      message?: {
        content?: string;
      };
    };

    const content = result.message?.content?.trim();
    if (!response.ok || !content) {
      throw new Error(result.error ?? "Ollama translation analysis failed.");
    }

    const parsed = JSON.parse(content) as unknown;
    items.push({
      asset,
      blocks: normalizeBlocks(parsed),
    });
  }

  return { items };
}
