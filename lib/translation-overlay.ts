import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export type TranslationBlock = {
  source_text: string;
  translated_text: string;
  box_2d: [number, number, number, number];
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [text];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export async function renderTranslationOverlay({
  jobId,
  inputPath,
  outputName,
  outputRelativePath,
  blocks,
}: {
  jobId: string;
  inputPath: string;
  outputName: string;
  outputRelativePath?: string;
  blocks: TranslationBlock[];
}) {
  const outputDir = path.join(process.cwd(), "public", "outputs");
  await mkdir(outputDir, { recursive: true });
  const finalRelativePath = outputRelativePath ?? outputName;
  const outputPath = path.join(outputDir, ...finalRelativePath.split("/"));
  await mkdir(path.dirname(outputPath), { recursive: true });
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  const svgBlocks = blocks
    .map((block) => {
      const [topRaw, leftRaw, bottomRaw, rightRaw] = block.box_2d;
      const x = Math.max(0, Math.round((leftRaw / 1000) * width));
      const y = Math.max(0, Math.round((topRaw / 1000) * height));
      const boxWidth = Math.max(60, Math.round(((rightRaw - leftRaw) / 1000) * width));
      const boxHeight = Math.max(28, Math.round(((bottomRaw - topRaw) / 1000) * height));
      let fontSize = Math.max(16, Math.round(boxHeight * 0.42));
      const padding = Math.max(10, Math.round(fontSize * 0.45));
      let charsPerLine = Math.max(8, Math.floor((boxWidth - padding * 2) / (fontSize * 0.56)));
      let lines = wrapText(block.translated_text, charsPerLine);

      while (lines.length * fontSize * 1.25 > boxHeight - padding && fontSize > 12) {
        fontSize -= 1;
        charsPerLine = Math.max(8, Math.floor((boxWidth - padding * 2) / (fontSize * 0.56)));
        lines = wrapText(block.translated_text, charsPerLine);
      }

      const tspans = lines
        .map(
          (line, index) =>
            `<tspan x="${x + padding}" dy="${index === 0 ? 0 : fontSize * 1.22}">${escapeXml(line)}</tspan>`,
        )
        .join("");

      return `
        <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" rx="8" fill="rgba(255,255,255,0.92)" />
        <text x="${x + padding}" y="${y + padding + fontSize}" font-size="${fontSize}" font-family="Arial, Helvetica, sans-serif" fill="#101010" font-weight="600">
          ${tspans}
        </text>
      `;
    })
    .join("");

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${svgBlocks}
    </svg>
  `;

  await image.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).toFile(outputPath);

  return {
    name: outputName,
    previewUrl: `/outputs/${finalRelativePath}`,
    dimensions: `${width} x ${height}`,
    tags: ["result", "translation", jobId],
  };
}
