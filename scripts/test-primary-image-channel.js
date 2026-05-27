const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const projectRoot = path.resolve(__dirname, "..");
const secretsPath = path.join(projectRoot, "data", "provider-secrets.json");
const outputRoot = path.join(projectRoot, "data", "primary-channel-tests");
const timeoutMs = Number.parseInt(process.env.PRIMARY_TEST_TIMEOUT_MS || `${300 * 1000}`, 10);
const inputMaxEdge = Number.parseInt(process.env.PRIMARY_TEST_INPUT_MAX_EDGE || "1536", 10);

function nowLabel() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readSecrets() {
  const secrets = JSON.parse(fs.readFileSync(secretsPath, "utf8"));
  const apiKey = process.env.OPENAI_API_KEY || secrets.openaiApiKey || "";
  const baseUrl = (process.env.OPENAI_BASE_URL || secrets.openaiBaseUrl || "").replace(/\/$/, "");
  if (!apiKey || !baseUrl) {
    throw new Error("Primary OPENAI_API_KEY/openaiApiKey or OPENAI_BASE_URL/openaiBaseUrl is missing.");
  }
  return { apiKey, baseUrl };
}

function redact(value) {
  if (!value) {
    return "";
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function isLikelyImage(bytes) {
  if (bytes.length < 12) {
    return false;
  }
  const png = bytes[0] === 0x89 && bytes.subarray(1, 4).toString("ascii") === "PNG";
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const gif = bytes.subarray(0, 3).toString("ascii") === "GIF";
  const webp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return png || jpeg || gif || webp;
}

async function fetchBytes(url, init) {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timer = setTimeout(() => {
    controller.abort(new Error(`timeout after ${Math.round(timeoutMs / 1000)}s`));
  }, timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
      contentType: response.headers.get("content-type") || "",
      bytes,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function makeSmallPng() {
  return sharp({
    create: {
      width: 128,
      height: 128,
      channels: 3,
      background: { r: 37, g: 99, b: 235 },
    },
  })
    .png()
    .toBuffer();
}

async function makeSystemLikeImage() {
  const store = JSON.parse(fs.readFileSync(path.join(projectRoot, "data", "frameflow-store.json"), "utf8"));
  const requestedAssetId = process.env.PRIMARY_TEST_SOURCE_ASSET_ID || "";
  const assets = requestedAssetId
    ? store.assets.filter((asset) => asset.id === requestedAssetId)
    : store.assets;

  for (const asset of assets) {
    if (asset.source !== "browser-upload" || !asset.previewUrl) {
      continue;
    }

    const localPath = path.join(projectRoot, "public", asset.previewUrl.replace(/^\//, ""));
    if (!fs.existsSync(localPath)) {
      continue;
    }

    try {
      const original = await fs.promises.readFile(localPath);
      const metadata = await sharp(original).metadata();
      const pipeline = sharp(original).rotate().resize({
        width: inputMaxEdge,
        height: inputMaxEdge,
        fit: "inside",
        withoutEnlargement: true,
      });
      const bytes = metadata.hasAlpha
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : await pipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer();
      return {
        bytes,
        filename: metadata.hasAlpha ? "system-like-input.png" : "system-like-input.jpg",
        mimeType: metadata.hasAlpha ? "image/png" : "image/jpeg",
        sourceAssetId: asset.id,
        sourceName: asset.name,
        sourcePreviewUrl: asset.previewUrl,
      };
    } catch {
      continue;
    }
  }

  throw new Error(
    requestedAssetId
      ? `Requested asset could not be prepared with sharp: ${requestedAssetId}`
      : "No valid browser-upload asset could be prepared with sharp.",
  );
}

async function postEdit({ label, image, prompt, model, quality, size }) {
  const { apiKey, baseUrl } = readSecrets();
  const url = `${baseUrl}/images/edits`;
  const formData = new FormData();
  formData.append("model", model);
  formData.append("prompt", prompt);
  formData.append("quality", quality);
  if (size !== "auto") {
    formData.append("size", size);
  }
  formData.append("image", new Blob([new Uint8Array(image.bytes)], { type: image.mimeType }), image.filename);

  const result = await fetchBytes(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  return {
    label,
    baseUrl,
    apiKey: redact(apiKey),
    url,
    model,
    quality,
    size,
    input: {
      filename: image.filename,
      mimeType: image.mimeType,
      bytes: image.bytes.length,
      sourceAssetId: image.sourceAssetId,
      sourceName: image.sourceName,
      sourcePreviewUrl: image.sourcePreviewUrl,
    },
    result,
  };
}

async function run() {
  ensureDir(outputRoot);
  const runDir = path.join(outputRoot, nowLabel());
  ensureDir(runDir);

  const phase = process.argv[2] || "minimal-edit";
  const model = process.env.PRIMARY_TEST_MODEL || "gpt-image-2";
  const quality = process.env.PRIMARY_TEST_QUALITY || "high";
  const size = process.env.PRIMARY_TEST_SIZE || "1024x1024";

  let test;
  if (phase === "minimal-edit") {
    const bytes = await makeSmallPng();
    fs.writeFileSync(path.join(runDir, "input-minimal.png"), bytes);
    test = await postEdit({
      label: phase,
      image: { bytes, filename: "input-minimal.png", mimeType: "image/png" },
      prompt: "Return a clean simple image based on this blue square.",
      model,
      quality,
      size,
    });
  } else if (phase === "system-like-edit") {
    const image = await makeSystemLikeImage();
    fs.writeFileSync(path.join(runDir, image.filename), image.bytes);
    const prompt = process.env.PRIMARY_TEST_PROMPT ||
      "Keep the original layout, product, composition, colors, and visual style. Replace any visible Chinese text with natural English. Do not add unrelated elements.";
    test = await postEdit({
      label: phase,
      image,
      prompt,
      model,
      quality,
      size,
    });
  } else {
    throw new Error(`Unknown phase: ${phase}`);
  }

  const imageDetected = isLikelyImage(test.result.bytes);
  let decodedImage;
  if (!imageDetected) {
    try {
      const parsed = JSON.parse(test.result.bytes.toString("utf8"));
      const encoded = parsed?.data?.[0]?.b64_json || parsed?.images?.[0]?.b64_json || parsed?.images?.[0]?.base64;
      if (typeof encoded === "string" && encoded) {
        decodedImage = Buffer.from(encoded.replace(/^data:[^;]+;base64,/, ""), "base64");
      }
    } catch {
      decodedImage = undefined;
    }
  }
  const bodyPath = path.join(runDir, imageDetected ? "response-image.bin" : "response-body.txt");
  fs.writeFileSync(bodyPath, test.result.bytes);
  const decodedImagePath = decodedImage ? path.join(runDir, "decoded-output.png") : undefined;
  if (decodedImagePath) {
    fs.writeFileSync(decodedImagePath, decodedImage);
  }

  const summary = {
    phase,
    outputDir: runDir,
    request: {
      baseUrl: test.baseUrl,
      apiKey: test.apiKey,
      model: test.model,
      quality: test.quality,
      size: test.size,
      input: test.input,
      timeoutSeconds: Math.round(timeoutMs / 1000),
      inputMaxEdge,
    },
    response: {
      ok: test.result.ok,
      status: test.result.status,
      statusText: test.result.statusText,
      elapsedSeconds: test.result.elapsedSeconds,
      contentType: test.result.contentType,
      bytes: test.result.bytes.length,
      imageDetected,
      decodedImageDetected: decodedImage ? isLikelyImage(decodedImage) : false,
      savedBody: bodyPath,
      decodedImagePath,
      textPreview: imageDetected ? undefined : test.result.bytes.toString("utf8").slice(0, 500),
    },
  };

  fs.writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  const cause = error && typeof error === "object" ? error.cause : undefined;
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    cause: cause && typeof cause === "object"
      ? {
          code: cause.code,
          message: cause.message,
          name: cause.name,
        }
      : undefined,
    stack: error instanceof Error ? error.stack : undefined,
  }, null, 2));
  process.exit(1);
});
