import path from "node:path";
import type { Asset } from "@/lib/platform-types";

function sanitizeSegment(value: string) {
  return value
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getBaseName(filename: string) {
  const extension = path.extname(filename);
  const rawBase = path.basename(filename, extension);
  return sanitizeSegment(rawBase) || "file";
}

function normalizeRelativePath(input: string) {
  return input.replaceAll("\\", "/");
}

export function buildOutputName(asset: Asset, suffix: string, extension = "png") {
  const baseName = getBaseName(asset.name);
  const normalizedSuffix = sanitizeSegment(suffix) || "translated";
  const normalizedExtension = extension.replace(/^\./, "").toLowerCase() || "png";
  return `${baseName}-${normalizedSuffix}.${normalizedExtension}`;
}

export function buildOutputRelativePath(asset: Asset, outputName: string) {
  const relativePath = asset.relativePath ? normalizeRelativePath(asset.relativePath) : "";
  const directory = relativePath ? path.posix.dirname(relativePath) : ".";
  return directory === "." ? outputName : path.posix.join(directory, outputName);
}
