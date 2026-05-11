import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Asset } from "@/lib/platform-types";
import { getProviderSecret } from "@/lib/provider-secrets";

type RunInput = {
  assets: Asset[];
  prompt: string;
  model: string;
  size: string;
};

type RunResult = {
  outputs: Array<{
    name: string;
    previewUrl: string;
    dimensions: string;
    tags: string[];
    bytes: Buffer;
  }>;
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
    case "BMP":
      return "image/bmp";
    case "TIFF":
    case "TIF":
      return "image/tiff";
    default:
      return "application/octet-stream";
  }
}

async function downloadImageBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("下载通义万相结果图失败。");
  }
  return Buffer.from(await response.arrayBuffer());
}

async function waitForAsyncTask(taskId: string, apiKey: string) {
  for (let i = 0; i < 60; i += 1) {
    const response = await fetch(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );
    const result = (await response.json()) as {
      output?: {
        task_status?: string;
        results?: Array<{ url?: string }>;
      };
      message?: string;
    };

    const status = result.output?.task_status;
    if (status === "SUCCEEDED") {
      return result;
    }
    if (status === "FAILED" || status === "CANCELED") {
      throw new Error(result.message ?? "通义万相异步任务失败。");
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("通义万相任务等待超时。");
}

async function runWan27Edit({
  asset,
  prompt,
  model,
  size,
  apiKey,
}: {
  asset: Asset;
  prompt: string;
  model: string;
  size: string;
  apiKey: string;
}) {
  const inputPath = path.join(process.cwd(), "public", asset.previewUrl!.replace(/^\//, ""));
  const bytes = await readFile(inputPath);
  const imageDataUrl = `data:${getMimeType(asset)};base64,${bytes.toString("base64")}`;

  const payload: {
    model: string;
    input: {
      messages: Array<{
        role: "user";
        content: Array<{ image?: string; text?: string }>;
      }>;
    };
    parameters: {
      n: number;
      watermark: boolean;
      size?: string;
    };
  } = {
    model,
    input: {
      messages: [
        {
          role: "user",
          content: [{ image: imageDataUrl }, { text: prompt }],
        },
      ],
    },
    parameters: {
      n: 1,
      watermark: false,
    },
  };

  if (size !== "auto") {
    payload.parameters.size = size;
  }

  const response = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    },
  );

  const result = (await response.json()) as {
    message?: string;
    output?: {
      choices?: Array<{
        message?: {
          content?: Array<{ image?: string; type?: string }>;
        };
      }>;
    };
    usage?: {
      size?: string;
    };
  };

  const imageUrl = result.output?.choices?.[0]?.message?.content?.find((item) => item.image)?.image;
  if (!response.ok || !imageUrl) {
    throw new Error(result.message ?? "通义万相 2.7 图像编辑失败。");
  }

  return {
    imageUrl,
    dimensions: result.usage?.size?.replace("*", " x ") ?? "自动",
  };
}

async function runWanx21Edit({
  asset,
  prompt,
  model,
  apiKey,
}: {
  asset: Asset;
  prompt: string;
  model: string;
  apiKey: string;
}) {
  const inputPath = path.join(process.cwd(), "public", asset.previewUrl!.replace(/^\//, ""));
  const bytes = await readFile(inputPath);
  const imageDataUrl = `data:${getMimeType(asset)};base64,${bytes.toString("base64")}`;

  const response = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model,
        input: {
          function: "description_edit",
          prompt,
          base_image_url: imageDataUrl,
        },
        parameters: {
          n: 1,
          watermark: false,
        },
      }),
    },
  );

  const result = (await response.json()) as {
    message?: string;
    output?: {
      task_id?: string;
    };
  };

  const taskId = result.output?.task_id;
  if (!response.ok || !taskId) {
    throw new Error(result.message ?? "通义万相 2.1 图像编辑任务创建失败。");
  }

  const finalResult = await waitForAsyncTask(taskId, apiKey);
  const imageUrl = finalResult.output?.results?.[0]?.url;
  if (!imageUrl) {
    throw new Error("通义万相 2.1 未返回结果图。");
  }

  return {
    imageUrl,
    dimensions: "自动",
  };
}

export async function runDashScopeImageJob({
  assets,
  prompt,
  model,
  size,
}: RunInput): Promise<RunResult> {
  const apiKey = getProviderSecret("dashscope");

  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY 未配置。");
  }

  const outputs: RunResult["outputs"] = [];

  for (const asset of assets) {
    if (!asset.previewUrl) {
      continue;
    }

    const result = model.startsWith("wan2.7") || model.startsWith("wan2.6")
      ? await runWan27Edit({ asset, prompt, model, size, apiKey })
      : await runWanx21Edit({ asset, prompt, model, apiKey });

    const outputBytes = await downloadImageBytes(result.imageUrl);
    const outputName = `${Date.now()}-${asset.id}-dashscope.png`;

    outputs.push({
      name: outputName,
      previewUrl: `/outputs/${outputName}`,
      dimensions: result.dimensions,
      tags: ["result", "dashscope", model],
      bytes: outputBytes,
    });
  }

  return { outputs };
}
