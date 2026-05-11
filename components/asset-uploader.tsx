"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AssetUploader() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [filename, setFilename] = useState("未选择文件");

  async function handleSubmit(formData: FormData) {
    setError("");
    setStatus("");

    const response = await fetch("/api/assets", {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as {
      error?: string;
      items?: Array<unknown>;
      batchLabel?: string;
    };

    if (!response.ok) {
      setError(result.error ?? "上传失败");
      return;
    }

    setFilename("未选择文件");
    setStatus(`上传成功：${result.items?.length ?? 0} 个文件，已归入${result.batchLabel ?? "新批次"}`);
    startTransition(() => router.refresh());
  }

  return (
    <form
      className="action-form"
      action={(formData) => {
        void handleSubmit(formData);
      }}
    >
      <div className="form-grid">
        <label className="field-span-2">
          <span>文件</span>
          <input
            name="file"
            type="file"
            multiple
            accept="image/*,.zip,.webp,.png,.jpg,.jpeg,.tif,.tiff"
            onChange={(event) => {
              const count = event.target.files?.length ?? 0;
              setFilename(count ? `已选择 ${count} 个文件` : "未选择文件");
            }}
            required
          />
          <small className="form-hint">{filename}</small>
        </label>
        <label className="field-span-2">
          <span>标签</span>
          <input name="tags" placeholder="用逗号分隔，例如：海报, 商品图, 主视觉" />
        </label>
      </div>
      <div className="form-footer">
        <button type="submit" className="primary-button" disabled={isPending}>
          {isPending ? "上传中..." : "上传素材"}
        </button>
        {status ? <p className="form-hint">{status}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </form>
  );
}
