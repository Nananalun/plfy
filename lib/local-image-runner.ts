import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { Asset } from "@/lib/platform-types";

type RunInput = {
  jobId: string;
  preset: string;
  assets: Asset[];
};

type RunResult = {
  outputs: Array<{
    name: string;
    previewUrl: string;
    dimensions: string;
    tags: string[];
  }>;
};

async function applyPreset(instance: sharp.Sharp, preset: string) {
  switch (preset) {
    case "commerce-enhance":
      return instance
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .modulate({ brightness: 1.03, saturation: 1.08 })
        .sharpen();
    case "soft-light":
      return instance
        .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
        .gamma(1.08)
        .modulate({ brightness: 1.05, saturation: 0.94 })
        .linear(1.02, -6);
    case "thumbnail-boost":
      return instance
        .resize({ width: 1280, height: 720, fit: "cover", position: "centre" })
        .modulate({ brightness: 1.04, saturation: 1.12 })
        .sharpen();
    default:
      return instance.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
  }
}

export async function runLocalImageJob({ jobId, preset, assets }: RunInput): Promise<RunResult> {
  const outputDir = path.join(process.cwd(), "public", "outputs");
  await mkdir(outputDir, { recursive: true });

  const outputs: RunResult["outputs"] = [];

  for (const asset of assets) {
    if (!asset.previewUrl) {
      continue;
    }

    const inputPath = path.join(process.cwd(), "public", asset.previewUrl.replace(/^\//, ""));
    const extension = path.extname(inputPath) || ".jpg";
    const outputName = `${jobId}-${asset.id}${extension}`;
    const outputPath = path.join(outputDir, outputName);
    const pipeline = sharp(inputPath);
    const processed = await applyPreset(pipeline, preset);
    await processed.toFile(outputPath);

    const metadata = await sharp(outputPath).metadata();
    outputs.push({
      name: outputName,
      previewUrl: `/outputs/${outputName}`,
      dimensions: `${metadata.width ?? 0} x ${metadata.height ?? 0}`,
      tags: ["result", preset, jobId],
    });
  }

  return { outputs };
}
