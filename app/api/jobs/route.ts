import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getQueueLanes } from "@/lib/platform-data";
import { createAsset, createJob, getAssetsByIds, listJobs, updateJob } from "@/lib/mock-store";
import { runDashScopeImageJob } from "@/lib/dashscope-image-runner";
import { runLocalImageJob } from "@/lib/local-image-runner";
import { runOllamaTranslationJob } from "@/lib/ollama-translation-runner";
import { runOpenAIImageJob } from "@/lib/openai-image-runner";
import { runGeminiTranslationJob } from "@/lib/gemini-translation-runner";
import { runOpenAITranslationJob } from "@/lib/openai-translation-runner";
import { getOllamaConfig, getProviderSecret } from "@/lib/provider-secrets";
import { runQwenImageEditJob } from "@/lib/qwen-image-edit-runner";
import { renderTranslationOverlay } from "@/lib/translation-overlay";

export function GET() {
  return NextResponse.json({
    jobs: listJobs(),
    lanes: getQueueLanes(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    workflowName?: string;
    itemCount?: number;
    routingPolicy?: string;
    assetIds?: string[];
    preset?: string;
    provider?: "openai" | "local";
    taskType?: "redraw-translate-zh-en" | "translate-zh-en" | "creative-edit";
    providerModelFamily?: "openai" | "gemini" | "dashscope" | "ollama" | "qwen-local" | "local";
    model?: string;
    prompt?: string;
    quality?: string;
    size?: string;
  };

  if (
    !body.name ||
    !body.workflowName ||
    !body.itemCount ||
    !body.routingPolicy ||
    !Array.isArray(body.assetIds) ||
    body.assetIds.length === 0 ||
    !body.taskType ||
    !body.providerModelFamily ||
    !(
      body.taskType === "translate-zh-en"
        ? body.prompt && body.model && body.providerModelFamily !== "local"
        : body.provider === "openai" || body.providerModelFamily === "dashscope" || body.providerModelFamily === "qwen-local"
          ? body.prompt && body.model
          : body.preset
    )
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const job = createJob({
    name: body.name,
    workflowName: body.workflowName,
    itemCount: Number(body.itemCount),
    routingPolicy: body.routingPolicy,
    assetIds: body.assetIds,
    preset: body.preset,
    provider: body.provider ?? "local",
    taskType: body.taskType,
    providerModelFamily: body.providerModelFamily,
    model: body.model,
    prompt: body.prompt,
    quality: body.quality,
    size: body.size,
  });

  const assets = getAssetsByIds(body.assetIds).filter((asset) => asset.previewUrl);

  if (assets.length === 0) {
    updateJob(job.id, {
      status: "failed",
      statusTone: "red",
      progress: 100,
    });
    return NextResponse.json(
      { error: "Selected assets do not have local files to process." },
      { status: 400 },
    );
  }

  updateJob(job.id, {
    status: "running",
    statusTone: "blue",
    progress: 20,
  });

  try {
    const outputDir = path.join(process.cwd(), "public", "outputs");
    await mkdir(outputDir, { recursive: true });
    let outputCount = 0;

    if (body.taskType === "translate-zh-en") {
      const analysis =
        body.providerModelFamily === "gemini"
          ? await runGeminiTranslationJob({
              assets,
              model: body.model ?? "gemini-2.5-flash",
              prompt: body.prompt ?? "",
            })
          : await runOpenAITranslationJob({
              assets,
              model: body.model ?? "gpt-4.1-mini",
              prompt: body.prompt ?? "",
            });

      for (const item of analysis.items) {
        const output = await renderTranslationOverlay({
          jobId: job.id,
          inputPath: path.join(process.cwd(), "public", item.asset.previewUrl!.replace(/^\//, "")),
          outputName: `${job.id}-${item.asset.id}-translated.png`,
          blocks: item.blocks,
        });

        createAsset({
          name: output.name,
          kind: pathExtToKind(output.name),
          dimensions: output.dimensions,
          tags: output.tags,
          previewUrl: output.previewUrl,
          source: `job:${job.id}`,
        });
        outputCount += 1;
      }
    } else if (body.taskType === "redraw-translate-zh-en") {
      const prompts = await buildRedrawPrompts(assets, body.prompt ?? "");

      for (const asset of assets) {
        const result =
          body.providerModelFamily === "qwen-local"
            ? await runQwenImageEditJob({
                assets: [asset],
                prompt: prompts.get(asset.id) ?? createBaseRedrawPrompt(body.prompt ?? ""),
                model: body.model ?? "Qwen/Qwen-Image-Edit-2511",
              })
            : body.providerModelFamily === "dashscope"
            ? await runDashScopeImageJob({
                assets: [asset],
                prompt: prompts.get(asset.id) ?? createBaseRedrawPrompt(body.prompt ?? ""),
                model: body.model ?? "wan2.7-image-pro",
                size: body.size ?? "auto",
              })
            : body.provider === "openai"
              ? await runOpenAIImageJob({
                  assets: [asset],
                  prompt: prompts.get(asset.id) ?? createBaseRedrawPrompt(body.prompt ?? ""),
                  model: body.model ?? "gpt-image-1",
                  quality: body.quality ?? "high",
                  size: body.size ?? "auto",
                })
              : await runLocalImageJob({
                  jobId: job.id,
                  preset: body.preset ?? "commerce-enhance",
                  assets: [asset],
                });

        for (const output of result.outputs) {
          if ("bytes" in output) {
            await writeFile(path.join(outputDir, output.name), output.bytes);
          }

          createAsset({
            name: output.name,
            kind: pathExtToKind(output.name),
            dimensions: output.dimensions,
            tags: output.tags,
            previewUrl: output.previewUrl,
            source: `job:${job.id}`,
          });
        }

        outputCount += result.outputs.length;
      }
    } else {
      const result = await runLocalImageJob({
        jobId: job.id,
        preset: body.preset ?? "commerce-enhance",
        assets,
      });

      for (const output of result.outputs) {
        if ("bytes" in output) {
          await writeFile(path.join(outputDir, output.name), output.bytes);
        }

        createAsset({
          name: output.name,
          kind: pathExtToKind(output.name),
          dimensions: output.dimensions,
          tags: output.tags,
          previewUrl: output.previewUrl,
          source: `job:${job.id}`,
        });
      }
      outputCount = result.outputs.length;
    }

    const updatedJob = updateJob(job.id, {
      status: "succeeded",
      statusTone: "green",
      progress: 100,
      outputCount,
    });

    return NextResponse.json({ job: updatedJob }, { status: 201 });
  } catch (error) {
    updateJob(job.id, {
      status: "failed",
      statusTone: "red",
      progress: 100,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Job execution failed.",
      },
      { status: 500 },
    );
  }
}

function pathExtToKind(filename: string) {
  const match = filename.split(".").pop();
  return match ? match.toUpperCase() : "FILE";
}

function createBaseRedrawPrompt(userPrompt: string) {
  return [
    "Edit this existing image, not a new concept.",
    "Replace all visible Chinese text with natural English.",
    "Keep the original composition, layout, subject, background, spacing, hierarchy, colors, and visual style as close to the source image as possible.",
    "Do not add unrelated objects, logos, decorations, or extra text.",
    "Do not keep any Chinese characters in the final image.",
    "Make the final result look like a clean production-ready English version of the original.",
    userPrompt ? `Additional user instructions: ${userPrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function buildRedrawPrompts(assets: ReturnType<typeof getAssetsByIds>, userPrompt: string) {
  const prompts = new Map<string, string>();
  const fallbackPrompt = createBaseRedrawPrompt(userPrompt);

  for (const asset of assets) {
    prompts.set(asset.id, fallbackPrompt);
  }

  try {
    const ollamaConfig = getOllamaConfig();
    const analysis = ollamaConfig.visionModel
      ? await runOllamaTranslationJob({
          assets,
          model: ollamaConfig.visionModel,
          prompt: "Identify every visible Chinese text block and translate it into concise natural English.",
        })
      : getProviderSecret("openai")
      ? await runOpenAITranslationJob({
          assets,
          model: "gpt-4.1-mini",
          prompt: "Identify every visible Chinese text block and translate it into concise natural English.",
        })
      : getProviderSecret("gemini")
        ? await runGeminiTranslationJob({
            assets,
            model: "gemini-2.5-flash",
            prompt: "Identify every visible Chinese text block and translate it into concise natural English.",
          })
        : null;

    for (const item of analysis?.items ?? []) {
      const replacements = item.blocks
        .map((block) => [block.source_text?.trim(), block.translated_text?.trim()] as const)
        .filter(([source, translated]) => source && translated);

      if (!replacements.length) {
        continue;
      }

      const replacementList = Array.from(
        new Map(replacements.map(([source, translated]) => [`${source}=>${translated}`, { source, translated }])).values(),
      )
        .map(({ source, translated }) => `- "${source}" -> "${translated}"`)
        .join("\n");

      prompts.set(
        item.asset.id,
        [
          fallbackPrompt,
          "Use these exact text replacements for this image:",
          replacementList,
          "If a Chinese text block appears multiple times, translate all of them consistently.",
          "Preserve approximate text placement and visual hierarchy from the original image.",
        ].join("\n"),
      );
    }
  } catch {
    return prompts;
  }

  return prompts;
}
