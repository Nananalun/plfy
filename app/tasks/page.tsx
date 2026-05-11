import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { TaskActions } from "@/components/task-actions";
import { TaskCreator } from "@/components/task-creator";
import { listAssets, listJobs } from "@/lib/mock-store";

export default function TasksPage() {
  const jobs = listJobs();
  const assets = listAssets();
  const resultAssets = assets.filter((asset) => asset.source?.startsWith("job:"));

  const resultsByJob = new Map<string, typeof resultAssets>();
  for (const asset of resultAssets) {
    const jobId = asset.source?.replace("job:", "");
    if (!jobId) {
      continue;
    }

    const current = resultsByJob.get(jobId) ?? [];
    current.push(asset);
    resultsByJob.set(jobId, current);
  }

  return (
    <div className="stack-xl">
      <section className="page-header">
        <div>
          <p className="eyebrow">任务中心</p>
          <h1>批量生成</h1>
          <p>直接上传图片、填写提示词、选择模型，生成后在同一页查看和下载结果。</p>
        </div>
      </section>

      <section>
        <SectionCard title="生成面板" subtitle="主流程只保留上传、模型、提示词和生成。">
          <TaskCreator assets={assets} />
        </SectionCard>
      </section>

      <section className="table-card">
        <div className="table-head">
          <div>
            <p className="eyebrow">任务管理</p>
            <h2>最近任务</h2>
          </div>
        </div>

        <div className="result-list">
          {jobs.map((job) => {
            const outputs = resultsByJob.get(job.id) ?? [];
            const canDownload = job.status === "succeeded" && outputs.length > 0;

            return (
              <article key={job.id} className="result-card">
                <div className="result-card-head">
                  <div className="stack-sm">
                    <strong>{job.name}</strong>
                    <p className="result-meta">
                      <span>模型 {job.providerModelFamily}:{job.model ?? "-"}</span>
                      <span>进度 {job.progress}%</span>
                      <span>输入 {job.itemCount} 张</span>
                      <span>输出 {job.outputCount ?? outputs.length} 张</span>
                    </p>
                  </div>
                  <StatusPill tone={job.statusTone}>{job.status}</StatusPill>
                </div>

                {job.prompt ? <p className="result-prompt">提示词：{job.prompt}</p> : null}

                <TaskActions jobId={job.id} disabled={!canDownload} />

                {outputs.length ? (
                  <div className="result-grid">
                    {outputs.map((asset) => (
                      <figure key={asset.id} className="result-thumb-card">
                        <div className="result-thumb">
                          <img src={asset.previewUrl} alt={asset.name} />
                        </div>
                        <figcaption className="result-thumb-copy">
                          <strong>{asset.name}</strong>
                          <p>{asset.dimensions}</p>
                          <a href={asset.previewUrl} target="_blank" rel="noreferrer">
                            查看原图
                          </a>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p className="form-hint">
                    {job.status === "succeeded" ? "任务已完成，但当前没有找到输出图片。" : "任务完成后，结果图会显示在这里。"}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
