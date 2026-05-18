import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Asset } from "@/lib/platform-types";
import type { TranslationBlock } from "@/lib/translation-overlay";
import { getOpenAIEndpoints } from "@/lib/provider-secrets";

type RunInput = {
  assets: Asset[];
  model: string;
  prompt: string;
};

type RunResult = {
  items: Array<{
    asset: Asset;
    blocks: TranslationBlock[];
    endpointUsed?: string;
    attemptLog?: string[];
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

function normalizeBlocks(value: unknown) {
  const candidate = value as { blocks?: TranslationBlock[] };
  return Array.isArray(candidate?.blocks) ? candidate.blocks : [];
}

export async function runOpenAITranslationJob({
  assets,
  model,
  prompt,
}: RunInput): Promise<RunResult> {
  const endpoints = getOpenAIEndpoints();

  if (!endpoints.length) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const items: RunResult["items"] = [];

  for (const asset of assets) {
    if (!asset.previewUrl) {
      continue;
    }

    const inputPath = path.join(process.cwd(), "public", asset.previewUrl.replace(/^\//, ""));
    const bytes = await readFile(inputPath);
    const dataUrl = `data:${getMimeType(asset)};base64,${bytes.toString("base64")}`;
    let parsed: unknown | null = null;
    let endpointUsed = "";
    const attemptLog: string[] = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${endpoint.baseUrl}/responses`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${endpoint.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            input: [
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text:
                      `${prompt}\nReturn JSON only. Detect every visible Chinese text block in the image and translate it to natural English. ` +
                      `Use normalized coordinates from 0 to 1000 as [top,left,bottom,right]. ` +
                      `If there is no Chinese text, return {"blocks":[]}.`,
                  },
                  {
                    type: "input_image",
                    image_url: dataUrl,
                  },
                ],
              },
            ],
            text: {
              format: {
                type: "json_schema",
                name: "translated_blocks",
                schema: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    blocks: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
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
              },
            },
          }),
        });

        const result = (await response.json()) as {
          error?: { message?: string };
          output_text?: string;
        };

        if (!response.ok || !result.output_text) {
          attemptLog.push(`${endpoint.label}: fail - ${result.error?.message ?? "OpenAI translation analysis failed."}`);
          continue;
        }

        parsed = JSON.parse(result.output_text) as unknown;
        endpointUsed = endpoint.label;
        attemptLog.push(`${endpoint.label}: success`);
        break;
      } catch (error) {
        attemptLog.push(`${endpoint.label}: fail - ${error instanceof Error ? error.message : "OpenAI translation analysis failed."}`);
      }
    }

    if (!parsed) {
      throw new Error(attemptLog.join(" | "));
    }
    items.push({
      asset,
      blocks: normalizeBlocks(parsed),
      endpointUsed,
      attemptLog,
    });
  }

  return { items };
}
