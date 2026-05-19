import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { Asset } from "@/lib/platform-types";
import { buildOutputName } from "@/lib/output-naming";
import { getOpenAIEndpoints } from "@/lib/provider-secrets";

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
    endpointUsed?: string;
    attemptLog?: string[];
  }>;
};

const MAX_INPUT_IMAGE_EDGE = 1536;
const JPEG_UPLOAD_QUALITY = 88;
const IMAGE_EDIT_TIMEOUT_MS = 10 * 60_000;
const GENERATED_IMAGE_DOWNLOAD_TIMEOUT_MS = 2 * 60_000;

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

function describeFetchError(error: unknown) {
  if (!(error instanceof Error)) {
    return "OpenAI image edit failed.";
  }

  const cause = error.cause as { code?: string; message?: string } | undefined;
  const details = [
    error.message,
    cause?.code ? `cause code ${cause.code}` : "",
    cause?.message ? `cause ${cause.message}` : "",
  ].filter(Boolean);

  return details.join(" - ");
}

async function prepareUploadImage(inputPath: string, asset: Asset) {
  const originalBytes = await readFile(inputPath);
  const metadata = await sharp(originalBytes).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const shouldResize = Math.max(width, height) > MAX_INPUT_IMAGE_EDGE;

  if (!shouldResize && originalBytes.length < 1_000_000) {
    return {
      bytes: originalBytes,
      mimeType: getMimeType(asset),
      filename: path.basename(asset.name),
    };
  }

  const pipeline = sharp(originalBytes).rotate().resize({
    width: MAX_INPUT_IMAGE_EDGE,
    height: MAX_INPUT_IMAGE_EDGE,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (metadata.hasAlpha) {
    const bytes = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    return {
      bytes,
      mimeType: "image/png",
      filename: path.basename(asset.name).replace(/\.[^.]+$/, ".png"),
    };
  }

  const bytes = await pipeline.jpeg({ quality: JPEG_UPLOAD_QUALITY, mozjpeg: true }).toBuffer();
  return {
    bytes,
    mimeType: "image/jpeg",
    filename: path.basename(asset.name).replace(/\.[^.]+$/, ".jpg"),
  };
}

export async function runOpenAIImageJob({
  assets,
  prompt,
  model,
  quality,
  size,
}: RunInput): Promise<RunResult> {
  const endpoints = getOpenAIEndpoints();

  if (!endpoints.length) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const outputs: RunResult["outputs"] = [];

  for (const asset of assets) {
    if (!asset.previewUrl) {
      continue;
    }

    const inputPath = path.join(process.cwd(), "public", asset.previewUrl.replace(/^\//, ""));
    const upload = await prepareUploadImage(inputPath, asset);
    const blob = new Blob([new Uint8Array(upload.bytes)], { type: upload.mimeType });
    let outputBytes: Buffer | null = null;
    let endpointUsed = "";
    const attemptLog: string[] = [];

    for (const endpoint of endpoints) {
      const formData = new FormData();
      formData.append("model", model);
      formData.append("prompt", prompt);
      if (size !== "auto") {
        formData.append("size", size);
      }
      formData.append("quality", quality);
      formData.append("image", blob, upload.filename);

      const startedAt = Date.now();

      try {
        const response = await fetch(`${endpoint.baseUrl}/images/edits`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${endpoint.apiKey}`,
          },
          body: formData,
          signal: AbortSignal.timeout(IMAGE_EDIT_TIMEOUT_MS),
        });
        const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);

        const contentType = (response.headers.get("content-type") || "").toLowerCase();

        if (response.ok && (contentType.startsWith("image/") || contentType.includes("application/octet-stream"))) {
          outputBytes = Buffer.from(await response.arrayBuffer());
          endpointUsed = endpoint.label;
          attemptLog.push(`${endpoint.label}: success (${elapsedSeconds}s)`);
          break;
        }

        const rawText = await response.text();
        let result:
          | {
              error?: { message?: string };
              data?: Array<{ b64_json?: string; url?: string }>;
            }
          | null = null;

        try {
          result = rawText
            ? (JSON.parse(rawText) as {
                error?: { message?: string };
                data?: Array<{ b64_json?: string; url?: string }>;
              })
            : null;
        } catch {
          result = null;
        }

        if (response.ok && result?.data?.[0]?.b64_json) {
          outputBytes = Buffer.from(result.data[0].b64_json, "base64");
          endpointUsed = endpoint.label;
          attemptLog.push(`${endpoint.label}: success (${elapsedSeconds}s)`);
          break;
        }

        if (response.ok && result?.data?.[0]?.url) {
          const fileResponse = await fetch(result.data[0].url, {
            signal: AbortSignal.timeout(GENERATED_IMAGE_DOWNLOAD_TIMEOUT_MS),
          });
          if (!fileResponse.ok) {
            attemptLog.push(`${endpoint.label}: fail - Generated image URL could not be downloaded (${fileResponse.status}).`);
            break;
          }

          outputBytes = Buffer.from(await fileResponse.arrayBuffer());
          endpointUsed = endpoint.label;
          attemptLog.push(`${endpoint.label}: success (${elapsedSeconds}s)`);
          break;
        }

        const fallbackMessage =
          result?.error?.message ??
          (rawText ? rawText.slice(0, 240) : `OpenAI image edit failed with status ${response.status}.`);
        attemptLog.push(`${endpoint.label}: fail (${elapsedSeconds}s) - ${fallbackMessage}`);
      } catch (error) {
        const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
        attemptLog.push(`${endpoint.label}: fail (${elapsedSeconds}s) - ${describeFetchError(error)}`);
      }

      if (outputBytes) {
        break;
      }
    }

    if (!outputBytes) {
      throw new Error(attemptLog.join(" | "));
    }
    const outputName = buildOutputName(asset, "translated", "png");

    outputs.push({
      name: outputName,
      previewUrl: `/outputs/${outputName}`,
      dimensions: size.replace("x", " x "),
      tags: ["result", "openai", model],
      bytes: outputBytes,
      endpointUsed,
      attemptLog,
    });
  }

  return { outputs };
}
