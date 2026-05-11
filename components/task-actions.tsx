"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function TaskActions({
  jobId,
  disabled,
}: {
  jobId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm("删除后会同时移除该任务生成的结果图，确定继续吗？");
    if (!confirmed) {
      return;
    }

    setError("");
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error ?? "删除失败。");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="task-actions">
      <a
        className={`secondary-button${disabled ? " button-disabled" : ""}`}
        href={disabled ? undefined : `/api/jobs/${jobId}/download`}
        aria-disabled={disabled}
      >
        下载全部
      </a>
      <button
        type="button"
        className="secondary-button button-danger"
        onClick={() => void handleDelete()}
        disabled={isPending}
      >
        {isPending ? "删除中..." : "删除任务"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
