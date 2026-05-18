"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import type { Asset } from "@/lib/platform-types";

type OutputsApiResponse = {
  items: Asset[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

const OUTPUTS_PER_PAGE = 24;

export function TaskResultPreviews({
  jobId,
  initialCount,
  initialSamples,
}: {
  jobId: string;
  initialCount: number;
  initialSamples: Asset[];
}) {
  const [open, setOpen] = useState(false);
  const [outputs, setOutputs] = useState<Asset[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(Math.max(1, Math.ceil(initialCount / OUTPUTS_PER_PAGE)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const primaryAsset = initialSamples[0];

  const loadOutputs = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(OUTPUTS_PER_PAGE),
      });
      const response = await fetch(`/api/jobs/${jobId}/outputs?${params.toString()}`, {
        cache: "no-store",
      });

      const result = (await response.json()) as OutputsApiResponse & { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Failed to load outputs.");
        return;
      }

      setOutputs(result.items);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch {
      setError("Failed to load outputs.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  return (
    <div className="stack-sm">
      <div className="result-preview-toolbar">
        <strong>Result files ({initialCount})</strong>
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={() => {
            const nextOpen = !open;
            setOpen(nextOpen);
            if (nextOpen && outputs.length === 0) {
              void loadOutputs(1);
            }
          }}
        >
          {open ? "Hide outputs" : "Browse outputs"}
        </button>
      </div>

      {!open && primaryAsset ? (
        <div className="result-grid result-grid-compact">
          <ResultThumb asset={primaryAsset} />
        </div>
      ) : null}

      {open ? (
        <div className="stack-sm">
          {loading ? <p className="form-hint">Loading outputs...</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {outputs.length ? (
            <div className="result-grid">
              {outputs.map((asset) => (
                <ResultThumb key={asset.id} asset={asset} />
              ))}
            </div>
          ) : !loading && !error ? (
            <p className="form-hint">No output images are available for this page.</p>
          ) : null}
          <div className="form-footer">
            <button
              type="button"
              className="secondary-button compact-button"
              disabled={page <= 1 || loading}
              onClick={() => void loadOutputs(Math.max(1, page - 1))}
            >
              Previous outputs
            </button>
            <span className="form-hint">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="secondary-button compact-button"
              disabled={page >= totalPages || loading}
              onClick={() => void loadOutputs(Math.min(totalPages, page + 1))}
            >
              Next outputs
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultThumb({ asset }: { asset: Asset }) {
  return (
    <figure className="result-thumb-card">
      <div className="result-thumb">
        <Image
          src={asset.previewUrl!}
          alt={asset.relativePath || asset.name}
          fill
          sizes="(max-width: 980px) 100vw, 240px"
        />
      </div>
      <figcaption className="result-thumb-copy">
        <strong>{asset.relativePath || asset.name}</strong>
        <p>{asset.dimensions}</p>
        <a href={asset.previewUrl} target="_blank" rel="noreferrer">
          Open result
        </a>
      </figcaption>
    </figure>
  );
}
