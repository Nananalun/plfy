"use client";

import { useEffect, useState, useTransition } from "react";

type ProviderFormState = {
  openaiApiKey: string;
  geminiApiKey: string;
  dashscopeApiKey: string;
  ollamaBaseUrl: string;
  ollamaVisionModel: string;
  qwenImageWorkerUrl: string;
};

const initialForm: ProviderFormState = {
  openaiApiKey: "",
  geminiApiKey: "",
  dashscopeApiKey: "",
  ollamaBaseUrl: "http://127.0.0.1:11434",
  ollamaVisionModel: "",
  qwenImageWorkerUrl: "http://127.0.0.1:8012",
};

export function ProviderKeysForm() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<ProviderFormState>(initialForm);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/settings/keys");
      const result = (await response.json()) as ProviderFormState;
      setForm(result);
    })();
  }, []);

  async function handleSubmit(formData: FormData) {
    setStatus("");
    const payload = {
      openaiApiKey: String(formData.get("openaiApiKey") ?? ""),
      geminiApiKey: String(formData.get("geminiApiKey") ?? ""),
      dashscopeApiKey: String(formData.get("dashscopeApiKey") ?? ""),
      ollamaBaseUrl: String(formData.get("ollamaBaseUrl") ?? "http://127.0.0.1:11434"),
      ollamaVisionModel: String(formData.get("ollamaVisionModel") ?? ""),
      qwenImageWorkerUrl: String(formData.get("qwenImageWorkerUrl") ?? "http://127.0.0.1:8012"),
    };

    const response = await fetch("/api/settings/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setStatus(response.ok ? "已保存" : "保存失败");
    startTransition(() => {});
  }

  return (
    <form
      className="action-form"
      action={(formData) => {
        void handleSubmit(formData);
      }}
    >
      <div className="form-grid">
        <label>
          <span>OpenAI API Key</span>
          <input
            name="openaiApiKey"
            type="password"
            value={form.openaiApiKey}
            onChange={(event) => setForm((current) => ({ ...current, openaiApiKey: event.target.value }))}
            placeholder="可选，用于远程 OCR 和图像编辑"
          />
        </label>
        <label>
          <span>Gemini API Key</span>
          <input
            name="geminiApiKey"
            type="password"
            value={form.geminiApiKey}
            onChange={(event) => setForm((current) => ({ ...current, geminiApiKey: event.target.value }))}
            placeholder="可选，用于远程 OCR 和翻译识别"
          />
        </label>
        <label className="field-span-2">
          <span>通义万相 API Key</span>
          <input
            name="dashscopeApiKey"
            type="password"
            value={form.dashscopeApiKey}
            onChange={(event) => setForm((current) => ({ ...current, dashscopeApiKey: event.target.value }))}
            placeholder="用于阿里图片编辑"
          />
        </label>
        <label>
          <span>Ollama 地址</span>
          <input
            name="ollamaBaseUrl"
            value={form.ollamaBaseUrl}
            onChange={(event) => setForm((current) => ({ ...current, ollamaBaseUrl: event.target.value }))}
            placeholder="例如 http://127.0.0.1:11434"
          />
        </label>
        <label>
          <span>Ollama 视觉模型</span>
          <input
            name="ollamaVisionModel"
            value={form.ollamaVisionModel}
            onChange={(event) => setForm((current) => ({ ...current, ollamaVisionModel: event.target.value }))}
            placeholder="例如 qwen2.5vl:7b 或 llava:latest"
          />
        </label>
        <label className="field-span-2">
          <span>Qwen 编辑 Worker 地址</span>
          <input
            name="qwenImageWorkerUrl"
            value={form.qwenImageWorkerUrl}
            onChange={(event) => setForm((current) => ({ ...current, qwenImageWorkerUrl: event.target.value }))}
            placeholder="例如 http://127.0.0.1:8012"
          />
        </label>
      </div>
      <div className="form-footer">
        <button type="submit" className="primary-button" disabled={isPending}>
          {isPending ? "保存中..." : "保存设置"}
        </button>
        {status ? <p className="form-hint">{status}</p> : null}
      </div>
    </form>
  );
}
