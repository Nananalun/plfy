"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AssetUploader() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [filename, setFilename] = useState("No file selected");

  async function handleSubmit(formData: FormData) {
    setError("");
    setStatus("");

    try {
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
        setError(result.error ?? "Upload failed.");
        return;
      }

      setFilename("No file selected");
      setStatus(`Uploaded ${result.items?.length ?? 0} file(s) into ${result.batchLabel ?? "a new batch"}.`);
      startTransition(() => router.refresh());
    } catch {
      setError("Upload request failed. Check the network or server logs.");
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
        <label className="field-span-2">
          <span>Files</span>
          <input
            name="file"
            type="file"
            multiple
            accept="image/*,.zip,.webp,.png,.jpg,.jpeg,.tif,.tiff"
            onChange={(event) => {
              const count = event.target.files?.length ?? 0;
              setFilename(count ? `${count} file(s) selected` : "No file selected");
            }}
            required
          />
          <small className="form-hint">{filename}</small>
        </label>
        <label className="field-span-2">
          <span>Tags</span>
          <input name="tags" placeholder="Comma separated, for example: poster, product, hero" />
        </label>
      </div>
      <div className="form-footer">
        <button type="submit" className="primary-button" disabled={isPending}>
          {isPending ? "Uploading..." : "Upload assets"}
        </button>
        {status ? <p className="form-hint">{status}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </form>
  );
}
