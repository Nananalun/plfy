"use client";

import { useEffect, useState, useTransition } from "react";

type ProviderFormState = {
  openaiApiKey: string;
  openaiApiKeyConfigured?: boolean;
  openaiBaseUrl: string;
  openaiFallbackApiKey: string;
  openaiFallbackApiKeyConfigured?: boolean;
  openaiFallbackBaseUrl: string;
  geminiApiKey: string;
  geminiApiKeyConfigured?: boolean;
  dashscopeApiKey: string;
  dashscopeApiKeyConfigured?: boolean;
  ollamaBaseUrl: string;
  ollamaVisionModel: string;
  qwenImageWorkerUrl: string;
  jobRunnerMaxParallelJobs: number;
};

const initialForm: ProviderFormState = {
  openaiApiKey: "",
  openaiApiKeyConfigured: false,
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiFallbackApiKey: "",
  openaiFallbackApiKeyConfigured: false,
  openaiFallbackBaseUrl: "",
  geminiApiKey: "",
  geminiApiKeyConfigured: false,
  dashscopeApiKey: "",
  dashscopeApiKeyConfigured: false,
  ollamaBaseUrl: "http://127.0.0.1:11434",
  ollamaVisionModel: "",
  qwenImageWorkerUrl: "http://127.0.0.1:8012",
  jobRunnerMaxParallelJobs: 10,
};

export function ProviderKeysForm() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState("");
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
      openaiBaseUrl: String(formData.get("openaiBaseUrl") ?? "https://api.openai.com/v1"),
      openaiFallbackApiKey: String(formData.get("openaiFallbackApiKey") ?? ""),
      openaiFallbackBaseUrl: String(formData.get("openaiFallbackBaseUrl") ?? ""),
      geminiApiKey: String(formData.get("geminiApiKey") ?? ""),
      dashscopeApiKey: String(formData.get("dashscopeApiKey") ?? ""),
      ollamaBaseUrl: String(formData.get("ollamaBaseUrl") ?? "http://127.0.0.1:11434"),
      ollamaVisionModel: String(formData.get("ollamaVisionModel") ?? ""),
      qwenImageWorkerUrl: String(formData.get("qwenImageWorkerUrl") ?? "http://127.0.0.1:8012"),
      jobRunnerMaxParallelJobs: Number(formData.get("jobRunnerMaxParallelJobs") ?? 10),
    };

    const response = await fetch("/api/settings/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setStatus(response.ok ? "Saved" : "Save failed");
    startTransition(() => {});
  }

  async function handleConnectivityTest() {
    setTestStatus("");
    setTesting(true);

    try {
      const response = await fetch("/api/settings/openai-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openaiApiKey: form.openaiApiKey,
          openaiBaseUrl: form.openaiBaseUrl,
          model: "gpt-image-2",
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        results?: Array<{
          endpoint: string;
          ok: boolean;
          status?: number;
          message: string;
        }>;
      };

      if (!response.ok && !result.results?.length) {
        setTestStatus(result.error ?? "Connectivity test failed.");
        return;
      }

      setTestStatus(
        (result.results ?? [])
          .map((item) => `${item.endpoint}: ${item.ok ? "OK" : "FAIL"}${item.status ? ` (${item.status})` : ""} - ${item.message}`)
          .join("\n"),
      );
    } catch (error) {
      setTestStatus(error instanceof Error ? error.message : "Connectivity test failed.");
    } finally {
      setTesting(false);
    }
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
            placeholder={form.openaiApiKeyConfigured ? "Configured. Enter a new key only if you want to replace it." : "Optional, used for OpenAI-compatible OCR and image editing"}
          />
        </label>
        <label>
          <span>OpenAI Base URL</span>
          <input
            name="openaiBaseUrl"
            value={form.openaiBaseUrl}
            onChange={(event) => setForm((current) => ({ ...current, openaiBaseUrl: event.target.value }))}
            placeholder="For example https://api.openai.com/v1 or your proxy /v1"
          />
        </label>
        <label>
          <span>Fallback API Key</span>
          <input
            name="openaiFallbackApiKey"
            type="password"
            value={form.openaiFallbackApiKey}
            onChange={(event) => setForm((current) => ({ ...current, openaiFallbackApiKey: event.target.value }))}
            placeholder={form.openaiFallbackApiKeyConfigured ? "Configured. Enter a new key only if you want to replace it." : "Optional backup key used when primary OpenAI-compatible endpoint fails"}
          />
        </label>
        <label>
          <span>Fallback Base URL</span>
          <input
            name="openaiFallbackBaseUrl"
            value={form.openaiFallbackBaseUrl}
            onChange={(event) => setForm((current) => ({ ...current, openaiFallbackBaseUrl: event.target.value }))}
            placeholder="Optional backup /v1 endpoint"
          />
        </label>
        <label className="field-span-2">
          <span>Gemini API Key</span>
          <input
            name="geminiApiKey"
            type="password"
            value={form.geminiApiKey}
            onChange={(event) => setForm((current) => ({ ...current, geminiApiKey: event.target.value }))}
            placeholder={form.geminiApiKeyConfigured ? "Configured. Enter a new key only if you want to replace it." : "Optional, used for OCR and translation analysis"}
          />
        </label>
        <label className="field-span-2">
          <span>DashScope API Key</span>
          <input
            name="dashscopeApiKey"
            type="password"
            value={form.dashscopeApiKey}
            onChange={(event) => setForm((current) => ({ ...current, dashscopeApiKey: event.target.value }))}
            placeholder={form.dashscopeApiKeyConfigured ? "Configured. Enter a new key only if you want to replace it." : "Used for DashScope image editing"}
          />
        </label>
        <label>
          <span>Ollama Base URL</span>
          <input
            name="ollamaBaseUrl"
            value={form.ollamaBaseUrl}
            onChange={(event) => setForm((current) => ({ ...current, ollamaBaseUrl: event.target.value }))}
            placeholder="For example http://127.0.0.1:11434"
          />
        </label>
        <label>
          <span>Ollama Vision Model</span>
          <input
            name="ollamaVisionModel"
            value={form.ollamaVisionModel}
            onChange={(event) => setForm((current) => ({ ...current, ollamaVisionModel: event.target.value }))}
            placeholder="For example qwen2.5vl:7b or llava:latest"
          />
        </label>
        <label className="field-span-2">
          <span>Qwen Image Worker URL</span>
          <input
            name="qwenImageWorkerUrl"
            value={form.qwenImageWorkerUrl}
            onChange={(event) => setForm((current) => ({ ...current, qwenImageWorkerUrl: event.target.value }))}
            placeholder="For example http://127.0.0.1:8012"
          />
        </label>
        <label>
          <span>Job Parallelism</span>
          <input
            name="jobRunnerMaxParallelJobs"
            type="number"
            min={1}
            step={1}
            value={form.jobRunnerMaxParallelJobs}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                jobRunnerMaxParallelJobs: Math.max(1, Number.parseInt(event.target.value || "1", 10) || 1),
              }))
            }
            placeholder="Use 1-2 while validating provider stability"
          />
        </label>
      </div>
      <div className="form-footer">
        <button type="submit" className="primary-button" disabled={isPending}>
          {isPending ? "Saving..." : "Save settings"}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => void handleConnectivityTest()}
          disabled={testing}
        >
          {testing ? "Testing..." : "Test OpenAI Connectivity"}
        </button>
        {status ? <p className="form-hint">{status}</p> : null}
        {testStatus ? <pre className="form-hint">{testStatus}</pre> : null}
      </div>
    </form>
  );
}
