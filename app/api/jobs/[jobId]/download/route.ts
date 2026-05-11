import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAssetsBySource, getJobById } from "@/lib/mock-store";
import { createZip } from "@/lib/zip";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = getJobById(jobId);

  if (!job) {
    return NextResponse.json({ error: "任务不存在。" }, { status: 404 });
  }

  const outputs = getAssetsBySource(`job:${jobId}`).filter((asset) => asset.previewUrl);
  if (!outputs.length) {
    return NextResponse.json({ error: "当前任务没有可下载的结果图。" }, { status: 404 });
  }

  const entries = await Promise.all(
    outputs.map(async (asset, index) => {
      const filePath = path.join(process.cwd(), "public", asset.previewUrl!.replace(/^\//, ""));
      const bytes = await readFile(filePath);
      const extension = path.extname(asset.name) || ".png";
      const filename = `${String(index + 1).padStart(3, "0")}-${asset.name.replace(/[\\/:*?\"<>|]+/g, "-")}${extension && asset.name.endsWith(extension) ? "" : extension}`;

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
      "Content-Disposition": `attachment; filename="${jobId}.zip"`,
      "Content-Length": String(zip.length),
    },
  });
}
