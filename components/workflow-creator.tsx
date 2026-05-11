"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const defaults = {
  name: "",
  trigger: "batch upload",
  summary: "",
  steps: "asset-input, remove-bg, inpaint, quality-check, export",
};

export function WorkflowCreator() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState(defaults);

  async function handleSubmit(formData: FormData) {
    setError("");

    const payload = {
      name: String(formData.get("name") ?? ""),
      trigger: String(formData.get("trigger") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      steps: String(formData.get("steps") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    const response = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error ?? "Failed to create workflow.");
      return;
    }

    setForm(defaults);
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
        <label>
          <span>工作流名</span>
          <input
            name="name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="例如：直播封面极速增强"
            required
          />
        </label>
        <label>
          <span>触发方式</span>
          <input
            name="trigger"
            value={form.trigger}
            onChange={(event) =>
              setForm((current) => ({ ...current, trigger: event.target.value }))
            }
            required
          />
        </label>
        <label className="field-span-2">
          <span>简介</span>
          <textarea
            name="summary"
            value={form.summary}
            onChange={(event) =>
              setForm((current) => ({ ...current, summary: event.target.value }))
            }
            placeholder="描述这个工作流解决什么问题。"
            required
          />
        </label>
        <label className="field-span-2">
          <span>步骤列表</span>
          <input
            name="steps"
            value={form.steps}
            onChange={(event) => setForm((current) => ({ ...current, steps: event.target.value }))}
            placeholder="逗号分隔，例如：normalize, retouch, export"
            required
          />
        </label>
      </div>
      <div className="form-footer">
        <button type="submit" className="primary-button" disabled={isPending}>
          {isPending ? "Creating..." : "发布工作流"}
        </button>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </form>
  );
}
