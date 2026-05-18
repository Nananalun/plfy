import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAssetsBySource, getJobById } from "@/lib/mock-store";
import { createZip } from "@/lib/zip";

function sanitizeArchiveName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").trim() || "outputs";
}

function getArchiveBaseName(jobId: string, relativePaths: string[]) {
  const firstSegments = relativePaths
    .map((relativePath) => relativePath.replaceAll("\\", "/").split("/")[0])
    .filter(Boolean);

  if (!firstSegments.length) {
    return jobId;
  }

  const uniqueFirstSegments = Array.from(new Set(firstSegments));
  return uniqueFirstSegments.length === 1 ? sanitizeArchiveName(uniqueFirstSegments[0]) : jobId;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = getJobById(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const outputs = getAssetsBySource(`job:${jobId}`).filter((asset) => asset.previewUrl);
  if (!outputs.length) {
    return NextResponse.json({ error: "This job has no downloadable outputs." }, { status: 404 });
  }

  if (outputs.length === 1) {
    const asset = outputs[0];
    const filePath = path.join(process.cwd(), "public", asset.previewUrl!.replace(/^\//, ""));
    const bytes = await readFile(filePath);
    const extension = path.extname(asset.name) || ".png";
    const filename = asset.relativePath
      ? asset.relativePath
          .replaceAll("\\", "/")
          .split("/")
          .map((segment) => segment.replace(/[\\:*?"<>|]+/g, "-"))
          .join("/")
      : `${asset.name.replace(/[\\/:*?"<>|]+/g, "-")}${asset.name.endsWith(extension) ? "" : extension}`;

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${sanitizeArchiveName(path.basename(filename))}"`,
        "Content-Length": String(bytes.length),
      },
    });
  }

  const archiveBaseName = getArchiveBaseName(
    jobId,
    outputs.map((asset) => asset.relativePath).filter(Boolean) as string[],
  );

  const entries = await Promise.all(
    outputs.map(async (asset) => {
      const filePath = path.join(process.cwd(), "public", asset.previewUrl!.replace(/^\//, ""));
      const bytes = await readFile(filePath);
      const extension = path.extname(asset.name) || ".png";
      const relativePath = asset.relativePath?.replaceAll("\\", "/");
      const filename = relativePath
        ? relativePath
            .split("/")
            .map((segment) => segment.replace(/[\\:*?"<>|]+/g, "-"))
            .join("/")
        : `${asset.name.replace(/[\\/:*?"<>|]+/g, "-")}${asset.name.endsWith(extension) ? "" : extension}`;

      return {
        name: filename,
        data: bytes,
      };
    }),
  );

  const zip = createZip(entries);

  return new NextResponse(zip, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${archiveBaseName}.zip"`,
      "Content-Length": String(zip.length),
    },
  });
}
