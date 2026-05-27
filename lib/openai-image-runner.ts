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

const MAX_INPUT_IMAGE_EDGE = 1024;
const JPEG_UPLOAD_QUALITY = 84;
const HIGHWAY_INPUT_IMAGE_EDGE = 1024;
const HIGHWAY_JPEG_UPLOAD_QUALITY = 75;
const HIGHWAY_QUALITY = "low";
const HIGHWAY_SIZE = "1024x1024";
const UPSTREAM_IMAGE_REQUEST_TIMEOUT_MS = 300 * 1000;

type OpenAIEndpoint = {
  label: string;
  apiKey: string;
  baseUrl: string;
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

function isHighwayImageEditEndpoint(endpoint: OpenAIEndpoint) {
  return /(^|\.)highwayapi\.ai$/i.test(new URL(endpoint.baseUrl).hostname) || endpoint.baseUrl.includes("/gpt-image-2-edit");
}

function getHighwayImageEditUrl(baseUrl: string) {
  if (baseUrl.includes("/gpt-image-2-edit")) {
    return baseUrl;
  }

  const url = new URL(baseUrl);
  return `${url.origin}/v3/gpt-image-2-edit`;
}

function normalizeImageString(value: string) {
  if (value.startsWith("data:")) {
    return Buffer.from(value.replace(/^data:[^;]+;base64,/, ""), "base64");
  }

  if (/^https?:\/\//i.test(value)) {
    return undefined;
  }

  return Buffer.from(value, "base64");
}

function extractHighwayImage(result: unknown) {
  const response = result as {
    images?: Array<string | { url?: string; b64_json?: string; base64?: string; image?: string }>;
  } | null;
  const first = response?.images?.[0];

  if (typeof first === "string") {
    return { url: /^https?:\/\//i.test(first) ? first : undefined, bytes: normalizeImageString(first) };
  }

  if (first?.url) {
    return { url: first.url, bytes: undefined };
  }

  const encoded = first?.b64_json ?? first?.base64 ?? first?.image;
  return encoded ? { url: undefined, bytes: normalizeImageString(encoded) } : { url: undefined, bytes: undefined };
}

function isImageContentType(contentType: string) {
  return contentType.startsWith("image/") || contentType.includes("application/octet-stream");
}

function isLikelyImageBytes(bytes: Buffer) {
  if (bytes.length < 12) {
    return false;
  }

  const png = bytes[0] === 0x89 && bytes.subarray(1, 4).toString("ascii") === "PNG";
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const gif = bytes.subarray(0, 3).toString("ascii") === "GIF";
  const webp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return png || jpeg || gif || webp;
}

function getImageResponseBytes(contentType: string, bytes: Buffer) {
  if (isImageContentType(contentType) && !contentType.includes("application/octet-stream")) {
    return bytes.length ? bytes : undefined;
  }

  if (contentType.includes("application/octet-stream") || !contentType) {
    return isLikelyImageBytes(bytes) ? bytes : undefined;
  }

  return isLikelyImageBytes(bytes) ? bytes : undefined;
}

function describeEndpoint(endpoint: OpenAIEndpoint) {
  try {
    return new URL(endpoint.baseUrl).host;
  } catch {
    return endpoint.baseUrl.replace(/^https?:\/\//i, "").split("/")[0] || "unknown-host";
  }
}

function logUpstreamResponse({
  endpoint,
  elapsedSeconds,
  status,
  contentType,
  byteLength,
  imageDetected,
}: {
  endpoint: OpenAIEndpoint;
  elapsedSeconds: number;
  status: number;
  contentType: string;
  byteLength: number;
  imageDetected: boolean;
}) {
  console.info(
    `[image-generation:upstream-response] endpoint=${endpoint.label} host=${describeEndpoint(endpoint)} status=${status} contentType="${contentType || "-"}" bytes=${byteLength} imageDetected=${imageDetected} elapsed=${elapsedSeconds}s`,
  );
}

function logUpstreamError(endpoint: OpenAIEndpoint, elapsedSeconds: number, error: unknown) {
  console.warn(
    `[image-generation:upstream-error] endpoint=${endpoint.label} host=${describeEndpoint(endpoint)} elapsed=${elapsedSeconds}s error="${describeFetchError(error)}"`,
  );
}

async function fetchAndReadBytes(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error(`Upstream image request timed out after ${UPSTREAM_IMAGE_REQUEST_TIMEOUT_MS / 1000}s.`));
  }, UPSTREAM_IMAGE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    return { response, bytes };
  } finally {
    clearTimeout(timeout);
  }
}

async function prepareUploadImage(inputPath: string, asset: Asset) {
  const originalBytes = await readFile(inputPath);
  const metadata = await sharp(originalBytes).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

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

async function prepareHighwayUploadImage(upload: Awaited<ReturnType<typeof prepareUploadImage>>) {
  const metadata = await sharp(upload.bytes).metadata();
  if (metadata.hasAlpha) {
    const bytes = await sharp(upload.bytes)
      .rotate()
      .resize({
        width: HIGHWAY_INPUT_IMAGE_EDGE,
        height: HIGHWAY_INPUT_IMAGE_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ compressionLevel: 9 })
      .toBuffer();

    return {
      bytes,
      mimeType: "image/png",
    };
  }

  const bytes = await sharp(upload.bytes)
    .rotate()
    .resize({
      width: HIGHWAY_INPUT_IMAGE_EDGE,
      height: HIGHWAY_INPUT_IMAGE_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: HIGHWAY_JPEG_UPLOAD_QUALITY, mozjpeg: true })
    .toBuffer();

  return {
    bytes,
    mimeType: "image/jpeg",
  };
}

async function runHighwayImageEdit({
  endpoint,
  upload,
  prompt,
}: {
  endpoint: OpenAIEndpoint;
  upload: Awaited<ReturnType<typeof prepareUploadImage>>;
  prompt: string;
}) {
  const highwayUpload = await prepareHighwayUploadImage(upload);
  const requestBody: Record<string, unknown> = {
    n: 1,
    image: `data:${highwayUpload.mimeType};base64,${highwayUpload.bytes.toString("base64")}`,
    prompt,
    quality: HIGHWAY_QUALITY,
    size: HIGHWAY_SIZE,
    background: "auto",
    output_format: "png",
  };
  const startedAt = Date.now();

  const { response, bytes: responseBytes } = await fetchAndReadBytes(getHighwayImageEditUrl(endpoint.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${endpoint.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const imageBytes = getImageResponseBytes(contentType, responseBytes);
  const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);

  logUpstreamResponse({
    endpoint,
    elapsedSeconds,
    status: response.status,
    contentType,
    byteLength: responseBytes.length,
    imageDetected: Boolean(imageBytes),
  });

  if (imageBytes) {
    return imageBytes;
  }

  const rawText = responseBytes.toString("utf8");
  let result: unknown = null;

  try {
    result = rawText ? JSON.parse(rawText) : null;
  } catch {
    result = null;
  }

  if (!response.ok) {
    const message =
      typeof result === "object" && result && "error" in result
        ? JSON.stringify((result as { error?: unknown }).error)
        : rawText.slice(0, 240);
    throw new Error(message || `Highway image edit failed with status ${response.status}.`);
  }

  const image = extractHighwayImage(result);
  if (image.bytes) {
    return image.bytes;
  }

  if (image.url) {
    const file = await fetchAndReadBytes(image.url, {});
    const fileResponse = file.response;
    if (!fileResponse.ok) {
      throw new Error(`Generated image URL could not be downloaded (${fileResponse.status}).`);
    }
    return file.bytes;
  }

  throw new Error(rawText ? rawText.slice(0, 240) : "Highway image edit response did not include an image.");
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
      if (isHighwayImageEditEndpoint(endpoint)) {
        const startedAt = Date.now();

        try {
          outputBytes = await runHighwayImageEdit({ endpoint, upload, prompt });
          const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
          endpointUsed = endpoint.label;
          attemptLog.push(`${endpoint.label}: success (${elapsedSeconds}s)`);
          break;
        } catch (error) {
          const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
          logUpstreamError(endpoint, elapsedSeconds, error);
          attemptLog.push(`${endpoint.label}: fail (${elapsedSeconds}s) - ${describeFetchError(error)}`);
          continue;
        }
      }

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
        const { response, bytes: responseBytes } = await fetchAndReadBytes(`${endpoint.baseUrl}/images/edits`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${endpoint.apiKey}`,
          },
          body: formData,
        });
        const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);

        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        const imageBytes = getImageResponseBytes(contentType, responseBytes);

        logUpstreamResponse({
          endpoint,
          elapsedSeconds,
          status: response.status,
          contentType,
          byteLength: responseBytes.length,
          imageDetected: Boolean(imageBytes),
        });

        if (imageBytes) {
          outputBytes = imageBytes;
          endpointUsed = endpoint.label;
          attemptLog.push(
            response.ok
              ? `${endpoint.label}: success (${elapsedSeconds}s)`
              : `${endpoint.label}: success (${elapsedSeconds}s, http ${response.status} image body)`,
          );
          break;
        }

        const rawText = responseBytes.toString("utf8");
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
          const file = await fetchAndReadBytes(result.data[0].url, {});
          const fileResponse = file.response;
          if (!fileResponse.ok) {
            attemptLog.push(`${endpoint.label}: fail - Generated image URL could not be downloaded (${fileResponse.status}).`);
            continue;
          }

          outputBytes = file.bytes;
          endpointUsed = endpoint.label;
          attemptLog.push(`${endpoint.label}: success (${elapsedSeconds}s)`);
          break;
        }

        const fallbackMessage =
          result?.error?.message ??
          (rawText ? rawText.slice(0, 240) : `OpenAI image edit failed with status ${response.status}.`);
        attemptLog.push(`${endpoint.label}: fail (${elapsedSeconds}s) - ${fallbackMessage}`);
        continue;
      } catch (error) {
        const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
        logUpstreamError(endpoint, elapsedSeconds, error);
        attemptLog.push(`${endpoint.label}: fail (${elapsedSeconds}s) - ${describeFetchError(error)}`);
        continue;
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
