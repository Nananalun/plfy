import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getIngestionChannels } from "@/lib/platform-data";
import { createAsset, listAssets } from "@/lib/mock-store";

export function GET() {
  return NextResponse.json({
    items: listAssets(),
    channels: getIngestionChannels(),
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("file");
  const tagsValue = String(formData.get("tags") ?? "");
  const batchId = `batch_${Date.now()}`;
  const batchLabel = `批次 ${new Date().toLocaleString("zh-CN", { hour12: false })}`;
  const uploadedAt = new Date().toISOString();

  if (!files.length || !files.every((file) => file instanceof File)) {
    return NextResponse.json({ error: "至少选择一个文件。" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const tags = tagsValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const created = [];

  for (const rawFile of files) {
    const file = rawFile as File;
    const extension = path.extname(file.name) || ".bin";
    const baseName = path.basename(file.name, extension).replace(/[^a-zA-Z0-9-_]/g, "-");
    const finalName = `${Date.now()}-${baseName}${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(path.join(uploadDir, finalName), buffer);
    let dimensions = `${Math.max(1, Math.round(buffer.byteLength / 1024))} KB`;
    const isImage = file.type.startsWith("image/");

    if (isImage) {
      const metadata = await sharp(buffer).metadata();
      if (metadata.width && metadata.height) {
        dimensions = `${metadata.width} x ${metadata.height}`;
      }
    }

    created.push(
      createAsset({
        name: file.name,
        kind: extension.replace(".", "").toUpperCase() || "FILE",
        dimensions,
        tags,
        previewUrl: isImage ? `/uploads/${finalName}` : undefined,
        source: "browser-upload",
        batchId,
        batchLabel,
        uploadedAt,
      }),
    );
  }

  return NextResponse.json({ items: created, batchId, batchLabel }, { status: 201 });
}
