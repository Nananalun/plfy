"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Asset } from "@/lib/platform-types";

type ProviderFamily = "dashscope" | "openai" | "qwen-local";

const defaults = {
  prompt:
    "保留原图的主体、构图、版式、层级、色彩和风格，只把图片中的中文改成自然英文。不要添加无关元素，不要改变产品、人物或背景，不要保留任何中文字符。",
  providerModelFamily: "qwen-local" as ProviderFamily,
  model: "Qwen/Qwen-Image-Edit-2511",
  size: "auto",
};

export function TaskCreator({ assets }: { assets: Asset[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadTags, setUploadTags] = useState("");
  const [form, setForm] = useState(defaults);

  const processableAssets = useMemo(
    () =>
      assets.filter(
        (asset) =>
          asset.previewUrl &&
          ["PNG", "JPG", "JPEG", "WEBP", "TIFF", "TIF"].includes(asset.kind.toUpperCase()),
      ),
    [assets],
  );

  async function handleUpload() {
    if (!files?.length) {
      setUploadError("请先选择图片。");
      return;
    }

    setUploadError("");
    setUploadStatus("");
    setUploading(true);

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("file", file);
    }
    formData.append("tags", uploadTags);

    const response = await fetch("/api/assets", {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as {
      error?: string;
      items?: Array<{ id: string }>;
      batchLabel?: string;
    };

    setUploading(false);

    if (!response.ok || !result.items?.length) {
      setUploadError(result.error ?? "上传失败。");
      return;
    }

    setSelectedIds(result.items.map((item) => item.id));
    setUploadStatus(
      `上传成功：${result.items.length} 张，已自动选中${result.batchLabel ? `（${result.batchLabel}）` : ""}。`,
    );
    setSelectedFileCount(0);
    setFiles(null);
    startTransition(() => router.refresh());
  }

  async function handleSubmit() {
    setError("");

    const payload = {
      name: `批量生成 ${new Date().toLocaleString("zh-CN", { hour12: false })}`,
      workflowName: "批量重绘",
      itemCount: selectedIds.length,
      routingPolicy: "quality-first",
      provider: form.providerModelFamily === "openai" ? "openai" : "local",
      providerModelFamily: form.providerModelFamily,
      taskType: "redraw-translate-zh-en",
      model: form.model,
      prompt: form.prompt,
      quality: "high",
      size: form.size,
      assetIds: selectedIds,
    };

    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error ?? "生成失败。");
      return;
    }

    setSelectedIds([]);
    setUploadStatus("");
    setForm(defaults);
    startTransition(() => router.refresh());
  }

  function selectLatestBatch() {
    const latestBatchId = processableAssets
      .filter((asset) => asset.batchId)
      .sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""))[0]?.batchId;

    if (!latestBatchId) {
      return;
    }

    setSelectedIds(processableAssets.filter((asset) => asset.batchId === latestBatchId).map((asset) => asset.id));
  }

  return (
    <div className="action-form">
      <div className="picker-card">
        <div className="picker-head">
          <strong>上传图片</strong>
          <span>{selectedFileCount ? `已选 ${selectedFileCount} 个文件` : "支持一次上传多张图片"}</span>
        </div>
        <div className="form-grid">
          <label className="field-span-2">
            <span>选择图片</span>
            <input
              type="file"
              multiple
              accept="image/*,.webp,.png,.jpg,.jpeg,.tif,.tiff"
              onChange={(event) => {
                setFiles(event.target.files);
                setSelectedFileCount(event.target.files?.length ?? 0);
              }}
            />
          </label>
          <label className="field-span-2">
            <span>标签</span>
            <input
              value={uploadTags}
              onChange={(event) => setUploadTags(event.target.value)}
              placeholder="可选，用逗号分隔"
            />
          </label>
        </div>
        <div className="form-footer">
          <button type="button" className="primary-button" onClick={() => void handleUpload()} disabled={uploading}>
            {uploading ? "上传中..." : "上传并自动选中"}
          </button>
          <button type="button" className="secondary-button" onClick={selectLatestBatch}>
            选择最近上传批次
          </button>
          {uploadStatus ? <p className="form-hint">{uploadStatus}</p> : null}
          {uploadError ? <p className="form-error">{uploadError}</p> : null}
        </div>
      </div>

      <div className="form-grid">
        <label>
          <span>模型提供方</span>
          <select
            value={form.providerModelFamily}
            onChange={(event) => {
              const providerModelFamily = event.target.value as ProviderFamily;
              setForm((current) => ({
                ...current,
                providerModelFamily,
                model:
                  providerModelFamily === "openai"
                    ? "gpt-image-1"
                    : providerModelFamily === "dashscope"
                      ? "wan2.7-image-pro"
                      : "Qwen/Qwen-Image-Edit-2511",
                size: "auto",
              }));
            }}
          >
            <option value="qwen-local">Qwen 本地编辑</option>
            <option value="dashscope">通义万相</option>
            <option value="openai">OpenAI</option>
          </select>
        </label>
        <label>
          <span>模型</span>
          <select
            value={form.model}
            onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
          >
            {form.providerModelFamily === "dashscope" ? (
              <>
                <option value="wan2.7-image-pro">wan2.7-image-pro</option>
                <option value="wanx2.1-imageedit">wanx2.1-imageedit</option>
                <option value="wanx2.0-imageedit">wanx2.0-imageedit</option>
              </>
            ) : form.providerModelFamily === "openai" ? (
              <option value="gpt-image-1">gpt-image-1</option>
            ) : (
              <option value="Qwen/Qwen-Image-Edit-2511">Qwen/Qwen-Image-Edit-2511</option>
            )}
          </select>
        </label>
        <label>
          <span>输出尺寸</span>
          <select
            value={form.size}
            onChange={(event) => setForm((current) => ({ ...current, size: event.target.value }))}
          >
            {form.providerModelFamily === "dashscope" ? (
              <>
                <option value="auto">auto</option>
                <option value="1024*1024">1024*1024</option>
                <option value="1280*720">1280*720</option>
                <option value="720*1280">720*1280</option>
              </>
            ) : form.providerModelFamily === "openai" ? (
              <>
                <option value="auto">auto</option>
                <option value="1024x1024">1024x1024</option>
                <option value="1536x1024">1536x1024</option>
                <option value="1024x1536">1024x1536</option>
              </>
            ) : (
              <option value="auto">auto</option>
            )}
          </select>
        </label>
        <label>
          <span>已选图片</span>
          <input value={`${selectedIds.length} 张`} readOnly />
        </label>
        <label className="field-span-2">
          <span>提示词</span>
          <textarea
            value={form.prompt}
            onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
            placeholder="例如：把图片中的中文改成自然英文，保持原排版和风格。"
          />
        </label>
      </div>

      <div className="form-footer">
        <button
          type="button"
          className="primary-button"
          disabled={isPending || selectedIds.length === 0}
          onClick={() => void handleSubmit()}
        >
          {isPending ? "生成中..." : "开始批量生成"}
        </button>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </div>
  );
}
