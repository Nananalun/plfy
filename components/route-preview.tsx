"use client";

import { useState } from "react";

type PreviewResult = {
  policy: string;
  batchMode: string;
  primaryModel?: { name: string; provider: string; pricing: string };
  fallbackModel?: { name: string; provider: string; pricing: string };
};

export function RoutePreview() {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    const payload = {
      capability: String(formData.get("capability") ?? ""),
      priority: String(formData.get("priority") ?? ""),
      itemCount: Number(formData.get("itemCount") ?? 0),
    };

    const response = await fetch("/api/models/route-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { error?: string; preview?: PreviewResult };

    if (!response.ok || !result.preview) {
      setError(result.error ?? "Failed to preview route.");
      setLoading(false);
      return;
    }

    setPreview(result.preview);
    setLoading(false);
  }

  return (
    <div className="stack-lg">
      <form
        className="action-form"
        action={(formData) => {
          void handleSubmit(formData);
        }}
      >
        <div className="form-grid">
          <label>
            <span>能力类型</span>
            <select name="capability" defaultValue="inpaint">
              <option value="inpaint">inpaint</option>
              <option value="background-remove">background-remove</option>
              <option value="upscale">upscale</option>
              <option value="style-transfer">style-transfer</option>
            </select>
          </label>
          <label>
            <span>策略</span>
            <select name="priority" defaultValue="quality-first">
              <option value="quality-first">quality-first</option>
              <option value="speed-first">speed-first</option>
              <option value="cost-balanced">cost-balanced</option>
              <option value="human-in-loop">human-in-loop</option>
            </select>
          </label>
          <label>
            <span>批量规模</span>
            <input name="itemCount" type="number" min="1" defaultValue="800" required />
          </label>
        </div>
        <div className="form-footer">
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Previewing..." : "预览路由"}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      </form>

      {preview ? (
        <div className="preview-card">
          <div className="preview-grid">
            <div>
              <span className="mini-label">Policy</span>
              <strong>{preview.policy}</strong>
            </div>
            <div>
              <span className="mini-label">Batch Mode</span>
              <strong>{preview.batchMode}</strong>
            </div>
            <div>
              <span className="mini-label">Primary</span>
              <strong>{preview.primaryModel?.name ?? "No match"}</strong>
              <p>{preview.primaryModel?.provider}</p>
            </div>
            <div>
              <span className="mini-label">Fallback</span>
              <strong>{preview.fallbackModel?.name ?? "No match"}</strong>
              <p>{preview.fallbackModel?.provider}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
