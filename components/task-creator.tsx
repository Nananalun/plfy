"use client";

import { useEffect, useRef, useState } from "react";
import type { Asset, Job } from "@/lib/platform-types";

type ProviderFamily = "dashscope" | "openai" | "qwen-local";
type BrowserFile = File & { webkitRelativePath?: string };

const defaults = {
  prompt:
    "Keep the original layout, subject, composition, colors, and visual style. Only replace visible Chinese text with natural English. Do not add unrelated elements or change the product, people, or background.",
  providerModelFamily: "qwen-local" as ProviderFamily,
  model: "Qwen/Qwen-Image-Edit-2511",
  size: "auto",
};

const directoryInputProps = {
  directory: "",
  webkitdirectory: "",
} as unknown as React.InputHTMLAttributes<HTMLInputElement>;

const selectionStorageKey = "frameflow-task-selection";

function topLevelFolder(relativePath: string) {
  const normalized = relativePath.replaceAll("\\", "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 1 ? parts[0] : "(root files)";
}

function summarizePaths(paths: string[]) {
  const counts = new Map<string, number>();
  for (const path of paths) {
    const folder = topLevelFolder(path);
    counts.set(folder, (counts.get(folder) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => ({ name, count }));
}

function formatFolderSummary(summary: Array<{ name: string; count: number }>) {
  if (!summary.length) {
    return "";
  }

  return summary.map((item) => `${item.name}: ${item.count}`).join(", ");
}

export function TaskCreator({ onJobCreated }: { onJobCreated?: (job: Job) => void | Promise<void> }) {
  const [isPending, setIsPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAssetPaths, setSelectedAssetPaths] = useState<string[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<BrowserFile[]>([]);
  const [groupByFolder, setGroupByFolder] = useState(true);
  const [form, setForm] = useState(defaults);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(selectionStorageKey);
    if (!raw) {
      return;
    }

    try {
      const saved = JSON.parse(raw) as { assetIds?: string[]; assetPaths?: string[]; batchId?: string };
      setSelectedIds(Array.isArray(saved.assetIds) ? saved.assetIds : []);
      setSelectedAssetPaths(Array.isArray(saved.assetPaths) ? saved.assetPaths : []);
      setSelectedBatchId(saved.batchId ?? "");
    } catch {
      window.sessionStorage.removeItem(selectionStorageKey);
    }
  }, []);

  useEffect(() => {
    if (selectedIds.length === 0 && !selectedBatchId) {
      window.sessionStorage.removeItem(selectionStorageKey);
      return;
    }

    window.sessionStorage.setItem(
      selectionStorageKey,
      JSON.stringify({
        assetIds: selectedIds,
        assetPaths: selectedAssetPaths,
        batchId: selectedBatchId,
      }),
    );
  }, [selectedAssetPaths, selectedBatchId, selectedIds]);

  function appendFiles(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    const incoming = Array.from(fileList) as BrowserFile[];
    setUploadError("");
    setUploadStatus("");
    setSelectedFiles((current) => {
      const seen = new Set(current.map((file) => `${file.webkitRelativePath || file.name}:${file.size}`));
      const merged = [...current];
      for (const file of incoming) {
        const key = `${file.webkitRelativePath || file.name}:${file.size}`;
        if (!seen.has(key)) {
          merged.push(file);
          seen.add(key);
        }
      }
      return merged;
    });
  }

  async function handleUpload() {
    if (!selectedFiles.length) {
      setUploadError("Select files or a folder first.");
      return;
    }

    setUploadError("");
    setUploadStatus("");
    setUploading(true);

    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append("file", file);
      formData.append("relativePath", file.webkitRelativePath || file.name);
    }
    formData.append("tags", uploadTags);

    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as {
        error?: string;
        items?: Array<Pick<Asset, "id" | "relativePath" | "name">>;
        batchId?: string;
        batchLabel?: string;
      };

      if (!response.ok || !result.items?.length) {
        setUploadError(result.error ?? "Upload failed.");
        return;
      }

      const uploadedPaths = result.items.map((item) => item.relativePath || item.name);
      setSelectedIds(result.items.map((item) => item.id));
      setSelectedAssetPaths(uploadedPaths);
      setSelectedBatchId(result.batchId ?? "");
      setUploadStatus(
        `Uploaded ${result.items.length} file(s)${
          result.batchLabel ? ` from ${result.batchLabel}` : ""
        }. ${formatFolderSummary(summarizePaths(uploadedPaths))}`,
      );
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (folderInputRef.current) {
        folderInputRef.current.value = "";
      }
    } catch {
      setUploadError("Upload request failed. Check the network or server logs.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setError("");

    if (selectedIds.length === 0 && !selectedBatchId) {
      setError("Upload images first.");
      return;
    }

    setIsPending(true);

    const payload = {
      name: `Batch ${new Date().toLocaleString("zh-CN", { hour12: false })}`,
      workflowName: "Batch Translation Redraw",
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
      batchId: selectedBatchId,
      autoRetryFailedItems: true,
      groupByTopLevelFolder: groupByFolder,
    };

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        setError(result.error ?? "Job creation failed.");
        return;
      }

      const result = (await response.json()) as { job?: Job; jobs?: Job[] };

      setSelectedIds([]);
      setSelectedAssetPaths([]);
      setSelectedBatchId("");
      setUploadStatus("");
      setForm(defaults);
      window.sessionStorage.removeItem(selectionStorageKey);
      await onJobCreated?.(result.jobs?.[0] ?? result.job!);
    } catch {
      setError("Job creation request failed. Check the network or server logs.");
    } finally {
      setIsPending(false);
    }
  }

  const pendingFolderSummary = summarizePaths(selectedFiles.map((file) => file.webkitRelativePath || file.name));
  const uploadedFolderSummary = summarizePaths(selectedAssetPaths);

  return (
    <div className="action-form">
      <div className="picker-card">
        <div className="picker-head">
          <strong>Upload Images</strong>
          <span>
            {selectedFiles.length
              ? `${selectedFiles.length} file(s) selected`
              : "Choose files or a full folder tree"}
          </span>
        </div>
        <div className="form-grid">
          <label className="field-span-2">
            <span>Files</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.webp,.png,.jpg,.jpeg,.tif,.tiff"
              onChange={(event) => {
                appendFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label className="field-span-2">
            <span>Folder</span>
            <input
              {...directoryInputProps}
              ref={folderInputRef}
              type="file"
              multiple
              accept="image/*,.webp,.png,.jpg,.jpeg,.tif,.tiff"
              onChange={(event) => {
                appendFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label className="field-span-2">
            <span>Tags</span>
            <input
              value={uploadTags}
              onChange={(event) => setUploadTags(event.target.value)}
              placeholder="Optional, comma separated"
            />
          </label>
        </div>
        {pendingFolderSummary.length ? (
          <div className="folder-summary">
            <strong>Pending upload</strong>
            <span>{formatFolderSummary(pendingFolderSummary)}</span>
          </div>
        ) : null}
        <div className="form-footer">
          <button type="button" className="primary-button" onClick={() => void handleUpload()} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload and select"}
          </button>
          {uploadStatus ? <p className="form-hint">{uploadStatus}</p> : null}
          {uploadError ? <p className="form-error">{uploadError}</p> : null}
        </div>
      </div>

      <div className="form-grid">
        <label>
          <span>Provider</span>
          <select
            value={form.providerModelFamily}
            onChange={(event) => {
              const providerModelFamily = event.target.value as ProviderFamily;
              setForm((current) => ({
                ...current,
                providerModelFamily,
                model:
                  providerModelFamily === "openai"
                    ? "gpt-image-2"
                    : providerModelFamily === "dashscope"
                      ? "wan2.7-image-pro"
                      : "Qwen/Qwen-Image-Edit-2511",
                size: "auto",
              }));
            }}
          >
            <option value="qwen-local">Qwen local</option>
            <option value="dashscope">DashScope</option>
            <option value="openai">OpenAI compatible</option>
          </select>
        </label>
        <label>
          <span>Model</span>
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
              <>
                <option value="gpt-image-2">gpt-image-2</option>
                <option value="gpt-image-1.5">gpt-image-1.5</option>
                <option value="gpt-image-1">gpt-image-1</option>
              </>
            ) : (
              <option value="Qwen/Qwen-Image-Edit-2511">Qwen/Qwen-Image-Edit-2511</option>
            )}
          </select>
        </label>
        <label>
          <span>Output size</span>
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
          <span>Selected assets</span>
          <input value={`${selectedIds.length} file(s)${selectedBatchId ? " selected" : ""}`} readOnly />
        </label>
        {uploadedFolderSummary.length ? (
          <label className="field-span-2">
            <span>Selected folders</span>
            <textarea value={formatFolderSummary(uploadedFolderSummary)} readOnly />
          </label>
        ) : null}
        <label>
          <span>Batch mode</span>
          <div className="checkbox-line">
            <input
              type="checkbox"
              checked={groupByFolder}
              onChange={(event) => setGroupByFolder(event.target.checked)}
            />
            <span>One job per top-level folder</span>
          </div>
        </label>
        <label className="field-span-2">
          <span>Prompt</span>
          <textarea
            value={form.prompt}
            onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
            placeholder="Describe how the Chinese text should be translated and how faithfully the layout should be preserved."
          />
        </label>
      </div>

      <div className="form-footer">
        <button
          type="button"
          className="primary-button"
          disabled={isPending || (selectedIds.length === 0 && !selectedBatchId)}
          onClick={() => void handleSubmit()}
        >
          {isPending ? "Creating..." : "Start batch job"}
        </button>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </div>
  );
}
