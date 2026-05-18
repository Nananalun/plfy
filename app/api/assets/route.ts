import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { createAsset } from "@/lib/mock-store";
import { getIngestionChannels } from "@/lib/platform-data";

const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"]);

function sanitizeRelativePath(value: string, fallback: string) {
  const normalized = (value || fallback).replaceAll("\\", "/");
  return normalized
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/") || fallback;
}

export function GET() {
  return NextResponse.json({
    items: [],
    channels: getIngestionChannels(),
    message: "Asset listing is disabled. Upload and process files from the Tasks page.",
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("file");
  const relativePaths = formData.getAll("relativePath").map((value) => String(value ?? ""));
  const tagsValue = String(formData.get("tags") ?? "");
  const batchId = `batch_${randomUUID()}`;
  const batchLabel = `Batch ${new Date().toLocaleString("zh-CN", { hour12: false })}`;
  const uploadedAt = new Date().toISOString();

  if (!files.length || !files.every((file) => file instanceof File)) {
    return NextResponse.json({ error: "Select at least one file." }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const tags = tagsValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const created = [];

  for (const [index, rawFile] of files.entries()) {
    const file = rawFile as File;
    const extension = (path.extname(file.name) || ".bin").toLowerCase();
    const baseName = path.basename(file.name, extension).replace(/[^a-zA-Z0-9-_]/g, "-");
    const finalName = `${randomUUID()}-${baseName}${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const relativePath = sanitizeRelativePath(relativePaths[index], file.name);

    let dimensions = `${Math.max(1, Math.round(buffer.byteLength / 1024))} KB`;
    const isImage = file.type.startsWith("image/") || IMAGE_EXTENSIONS.has(extension);

    if (isImage) {
      try {
        const metadata = await sharp(buffer).metadata();
        if (metadata.width && metadata.height) {
          dimensions = `${metadata.width} x ${metadata.height}`;
        }
      } catch {
        return NextResponse.json({ error: `${file.name} is not a valid image file.` }, { status: 400 });
      }
    }

    await writeFile(path.join(uploadDir, finalName), buffer);

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
        relativePath,
      }),
    );
  }

  return NextResponse.json({ items: created, batchId, batchLabel }, { status: 201 });
}
