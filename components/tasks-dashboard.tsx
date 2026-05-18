"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { TaskActions } from "@/components/task-actions";
import { TaskCreator } from "@/components/task-creator";
import { TaskResultPreviews } from "@/components/task-result-previews";
import type { JobListItem } from "@/lib/job-list-view";
import type { Asset } from "@/lib/platform-types";

type ResultSummary = {
  jobId: string;
  count: number;
  sampleAssets: Asset[];
};

type TasksDashboardProps = {
  initialJobs: JobListItem[];
  initialResultSummaries: ResultSummary[];
  initialPage: number;
  initialTotalPages: number;
  jobsPerPage: number;
};

type JobsApiResponse = {
  jobs: JobListItem[];
  resultSummaries: ResultSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function TasksDashboard({
  initialJobs,
  initialResultSummaries,
  initialPage,
  initialTotalPages,
  jobsPerPage,
}: TasksDashboardProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [resultSummaries, setResultSummaries] = useState(initialResultSummaries);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(jobsPerPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const refreshInFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const failureCountRef = useRef(0);

  const safePage = Math.min(page, totalPages);
  const shouldPoll = jobs.some((job) => job.status === "queued" || job.status === "running");
  const runningCount = jobs.filter((job) => job.status === "queued" || job.status === "running").length;
  const summariesByJob = new Map(resultSummaries.map((summary) => [summary.jobId, summary]));

  const syncPageUrl = useCallback((nextPage: number, nextPageSize: number) => {
    const params = new URLSearchParams();
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    if (nextPageSize !== 25) {
      params.set("pageSize", String(nextPageSize));
    }
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/tasks?${query}` : "/tasks");
  }, []);

  const refreshTasks = useCallback(async (nextPage?: number, nextPageSize?: number, replaceInFlight = false) => {
    if (refreshInFlightRef.current && !replaceInFlight) {
      return;
    }

    const requestedPage = nextPage ?? safePage;
    const requestedPageSize = nextPageSize ?? pageSize;
    const controller = new AbortController();
    if (replaceInFlight) {
      abortRef.current?.abort();
    }
    abortRef.current = controller;
    refreshInFlightRef.current = true;

    try {
      const params = new URLSearchParams({
        page: String(requestedPage),
        pageSize: String(requestedPageSize),
      });
      const response = await fetch(`/api/jobs?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        failureCountRef.current += 1;
        return;
      }

      const result = (await response.json()) as JobsApiResponse;
      failureCountRef.current = 0;
      setJobs(result.jobs);
      setResultSummaries(result.resultSummaries);
      setTotalPages(result.totalPages);
      setPage(result.page);
      setPageSize(result.pageSize);
      syncPageUrl(result.page, result.pageSize);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        failureCountRef.current += 1;
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        refreshInFlightRef.current = false;
      }
    }
  }, [pageSize, safePage, syncPageUrl]);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
      syncPageUrl(safePage, pageSize);
    }
  }, [page, pageSize, safePage, syncPageUrl]);

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    const delay = failureCountRef.current > 0 ? 5000 : 1800;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void refreshTasks();
    }, delay);

    return () => {
      window.clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [refreshTasks, shouldPoll]);

  return (
    <>
      <section>
        <SectionCard title="Create Job" subtitle="Folder uploads, image-to-image translation, and model routing in one place.">
          <TaskCreator
            onJobCreated={async () => {
              await refreshTasks(1);
            }}
          />
        </SectionCard>
      </section>

      <section className="table-card">
        <div className="table-head task-table-head">
          <div>
            <p className="eyebrow">Recent Jobs</p>
            <h2>Job Queue</h2>
            <p className="form-hint">
              Page {safePage} of {totalPages}. {runningCount} active on this page. Outputs load only when a job is opened.
            </p>
          </div>
          <div className="task-page-tools">
            <label>
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  const nextPageSize = Number.parseInt(event.target.value, 10);
              void refreshTasks(1, nextPageSize, true);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="job-table">
          <div className="job-table-row job-table-row-head">
            <span>Job</span>
            <span>Status</span>
            <span>Progress</span>
            <span>Outputs</span>
            <span>Actions</span>
          </div>
          {jobs.map((job) => {
            const summary = summariesByJob.get(job.id);
            const outputCount = summary?.count ?? job.outputCount ?? 0;
            const attentionItems = job.jobItems ?? [];
            const canDownload = outputCount > 0;
            const displaySuccessCount = job.successCount ?? 0;
            const totalCalls = job.totalCallCount ?? 0;
            const failedCalls = job.failedCallCount ?? 0;
            const successfulCalls = job.successfulCallCount ?? 0;
            const unfinishedCount = Math.max(0, job.itemCount - displaySuccessCount);
            const failedItemCount = job.failedCount ?? job.failedItemCount ?? 0;
            const pendingCount = job.pendingCount ?? 0;
            const renderingCount = job.runningCount ?? 0;
            const successProgress = Math.round((displaySuccessCount / Math.max(1, job.itemCount)) * 100);
            const renderingProgress = Math.round((renderingCount / Math.max(1, job.itemCount)) * 100);
            const renderingOffset = Math.min(successProgress, 100);
            const isPaused = Boolean(job.pausedAt) || job.status === "paused";
            const canPause = job.status !== "succeeded" && job.status !== "failed" && job.status !== "partial";

            return (
              <article key={job.id} className="job-table-row">
                <div className="job-main-cell">
                  <strong>{job.name}</strong>
                  <p className="result-meta">
                    <span>{job.providerModelFamily}:{job.model ?? "-"}</span>
                    <span>Total {job.itemCount}</span>
                    <span>Success {displaySuccessCount}</span>
                    <span>Unfinished {unfinishedCount}</span>
                    <span>Failed {failedItemCount}</span>
                    <span>Rendering {renderingCount}</span>
                    <span>Pending {pendingCount}</span>
                    <span>Calls {totalCalls}</span>
                    <span>Call ok {successfulCalls}</span>
                    <span>Call failed {failedCalls}</span>
                    {job.retriedItemCount > 0 ? <span>Retrying {job.retriedItemCount}</span> : null}
                    <span>Fallback {job.fallbackHitCount}</span>
                  </p>
                </div>
                <div>
                  <StatusPill tone={job.statusTone}>{job.status}</StatusPill>
                </div>
                <div className="progress-cell">
                  <div
                    className="progress-bar compact-progress task-progress-bar"
                    aria-label={`${displaySuccessCount} of ${job.itemCount} images succeeded`}
                  >
                    <span className="task-progress-success" style={{ width: `${successProgress}%` }} />
                    {renderingCount > 0 ? (
                      <span
                        className="task-progress-rendering"
                        style={{
                          left: `${renderingOffset}%`,
                          width: `${Math.min(renderingProgress, 100 - renderingOffset)}%`,
                        }}
                      />
                    ) : null}
                  </div>
                  <small>
                    {successProgress}% ({displaySuccessCount}/{job.itemCount} ok)
                  </small>
                </div>
                <div>
                  <strong>{outputCount}</strong>
                </div>
                <TaskActions
                  jobId={job.id}
                  disabled={!canDownload}
                  canRetryFailed={(job.failedItemCount ?? 0) > 0}
                  isPaused={isPaused}
                  canPause={canPause}
                  onJobsChanged={async () => {
                    await refreshTasks();
                  }}
                />

                <details className="job-detail-panel">
                  <summary>Details and outputs</summary>
                  <div className="stack-sm">
                    {job.prompt ? (
                      <div className="result-prompt-body compact-prompt">
                        <strong>Prompt</strong>
                        <p className="result-prompt">{job.prompt}</p>
                      </div>
                    ) : null}

                    {attentionItems.length ? (
                      <div className="stack-sm">
                        <strong>
                          Items needing attention ({attentionItems.length}
                          {job.failedItemCount > attentionItems.length ? ` of ${job.failedItemCount}` : ""})
                        </strong>
                        {attentionItems.map((item) => (
                          <p key={item.assetId} className="form-error">
                            {(item.relativePath || item.assetName) +
                              `: ${item.error || "Unknown error"} (attempts ${item.attemptCount ?? 0}, failed ${item.failedAttemptCount ?? 0})`}
                          </p>
                        ))}
                      </div>
                    ) : null}

                    {failedCalls > 0 ? (
                      <p className="form-hint">
                        Auto retry is enabled. Failed calls stay in the queue until every image succeeds or the job is paused.
                      </p>
                    ) : null}

                    {outputCount > 0 ? (
                      <TaskResultPreviews
                        jobId={job.id}
                        initialCount={outputCount}
                        initialSamples={summary?.sampleAssets ?? []}
                      />
                    ) : (
                      <p className="form-hint">
                        {job.status === "queued" || job.status === "running"
                          ? "This job is still processing. The queue refreshes automatically."
                          : "No output images are available for this job yet."}
                      </p>
                    )}
                  </div>
                </details>
              </article>
            );
          })}
        </div>

        <div className="form-footer task-pagination">
          <button
            type="button"
            className="secondary-button"
            disabled={safePage <= 1}
            onClick={() => void refreshTasks(1, undefined, true)}
          >
            First
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={safePage <= 1}
            onClick={() => void refreshTasks(Math.max(1, safePage - 1), undefined, true)}
          >
            Previous
          </button>
          <span className="form-hint">
            Page {safePage} / {totalPages}
          </span>
          <button
            type="button"
            className="secondary-button"
            disabled={safePage >= totalPages}
            onClick={() => void refreshTasks(Math.min(totalPages, safePage + 1), undefined, true)}
          >
            Next
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={safePage >= totalPages}
            onClick={() => void refreshTasks(totalPages, undefined, true)}
          >
            Last
          </button>
        </div>
      </section>
    </>
  );
}
