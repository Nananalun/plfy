"use client";

import { useState } from "react";

export function JobPromptEditor({
  jobId,
  prompt,
  onSaved,
}: {
  jobId: string;
  prompt: string;
  onSaved?: () => void | Promise<void>;
}) {
  const [value, setValue] = useState(prompt);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const changed = value.trim() !== prompt.trim();

  async function handleSave() {
    const nextPrompt = value.trim();
    if (!nextPrompt || saving) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: nextPrompt }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        setMessage(result.error ?? "Prompt update failed.");
        return;
      }

      await onSaved?.();
      setMessage("Prompt saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Prompt update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="job-prompt-editor">
      <label>
        <span>Prompt</span>
        <textarea value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <div className="form-footer">
        <button
          type="button"
          className="secondary-button compact-button"
          disabled={!changed || !value.trim() || saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving..." : "Save prompt"}
        </button>
        {message ? <span className={message === "Prompt saved." ? "form-hint" : "form-error"}>{message}</span> : null}
      </div>
    </div>
  );
}
