import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Asset } from "@/lib/platform-types";
import type { TranslationBlock } from "@/lib/translation-overlay";
import { getProviderSecret } from "@/lib/provider-secrets";

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

export async function runGeminiTranslationJob({
  assets,
  model,
  prompt,
}: RunInput): Promise<RunResult> {
  const apiKey = getProviderSecret("gemini");

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const items: RunResult["items"] = [];

  for (const asset of assets) {
    if (!asset.previewUrl) {
      continue;
    }

    const inputPath = path.join(process.cwd(), "public", asset.previewUrl.replace(/^\//, ""));
    const bytes = await readFile(inputPath);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    `${prompt}\nReturn JSON only. Detect every visible Chinese text block in the image and translate it to natural English. ` +
                    `Use normalized coordinates from 0 to 1000 as [top,left,bottom,right]. ` +
                    `If there is no Chinese text, return {"blocks":[]}.`,
                },
                {
                  inline_data: {
                    mime_type: getMimeType(asset),
                    data: bytes.toString("base64"),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      },
    );

    const result = (await response.json()) as {
      error?: { message?: string };
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!response.ok || !text) {
      throw new Error(result.error?.message ?? "Gemini translation analysis failed.");
    }

    const parsed = JSON.parse(text) as unknown;
    items.push({
      asset,
      blocks: normalizeBlocks(parsed),
    });
  }

  return { items };
}
