"use client";

import { useState } from "react";

export function TaskActions({
  jobId,
  disabled,
  canRetryFailed,
  isPaused,
  canPause,
  onJobsChanged,
}: {
  jobId: string;
  disabled?: boolean;
  canRetryFailed?: boolean;
  isPaused?: boolean;
  canPause?: boolean;
  onJobsChanged?: () => void | Promise<void>;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  function getDownloadFilename(disposition: string | null, fallback: string) {
    if (!disposition) {
      return fallback;
    }

    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match) {
      return decodeURIComponent(utf8Match[1]);
    }

    const plainMatch = disposition.match(/filename="([^"]+)"/i) ?? disposition.match(/filename=([^;]+)/i);
    return plainMatch?.[1]?.trim() || fallback;
  }

  async function handleDownload() {
    if (disabled || isDownloading) {
      return;
    }

    setError("");
    setIsDownloading(true);

    try {
      const response = await fetch(`/api/jobs/${jobId}/download`);
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        setError(result.error ?? "Download failed.");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getDownloadFilename(response.headers.get("Content-Disposition"), `${jobId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Delete this job and its generated outputs?");
    if (!confirmed) {
      return;
    }

    setError("");
    setIsPending(true);
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error ?? "Delete failed.");
      setIsPending(false);
      return;
    }

    await onJobsChanged?.();
    setIsPending(false);
  }

  async function handleRetryFailed() {
    setError("");
    setIsRetrying(true);
    const response = await fetch(`/api/jobs/${jobId}/retry-failed`, {
      method: "POST",
    });

    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error ?? "Retry failed.");
      setIsRetrying(false);
      return;
    }

    await onJobsChanged?.();
    setIsRetrying(false);
  }

  async function handlePauseToggle() {
    if (!canPause || isTogglingPause) {
      return;
    }

    setError("");
    setIsTogglingPause(true);
    const response = await fetch(`/api/jobs/${jobId}/pause`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paused: !isPaused }),
    });

    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error ?? "Pause update failed.");
      setIsTogglingPause(false);
      return;
    }

    await onJobsChanged?.();
    setIsTogglingPause(false);
  }

  return (
    <div className="task-actions">
      <button
        type="button"
        className={`secondary-button${disabled ? " button-disabled" : ""}`}
        onClick={() => void handleDownload()}
        disabled={disabled || isDownloading}
      >
        {isDownloading ? "Preparing..." : "Download outputs"}
      </button>
      {canRetryFailed ? (
        <button
          type="button"
          className="secondary-button"
          onClick={() => void handleRetryFailed()}
          disabled={isPending || isRetrying}
        >
          {isRetrying ? "Retrying..." : "Retry failed items"}
        </button>
      ) : null}
      {canPause ? (
        <button
          type="button"
          className="secondary-button"
          onClick={() => void handlePauseToggle()}
          disabled={isPending || isTogglingPause}
        >
          {isTogglingPause ? "Updating..." : isPaused ? "Resume" : "Pause"}
        </button>
      ) : null}
      <button
        type="button"
        className="secondary-button button-danger"
        onClick={() => void handleDelete()}
        disabled={isPending}
      >
        {isPending ? "Working..." : "Delete job"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
