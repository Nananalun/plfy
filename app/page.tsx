import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getDashboardMetrics, getModels, getQueueLanes } from "@/lib/platform-data";
import { listJobs, listWorkflows } from "@/lib/mock-store";

export default function DashboardPage() {
  const metrics = getDashboardMetrics();
  const jobs = listJobs().slice(0, 4);
  const workflows = listWorkflows().slice(0, 3);
  const models = getModels().slice(0, 4);
  const lanes = getQueueLanes();

  return (
    <div className="stack-xl">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">批量 AI 图片处理</p>
          <h1>先在本地跑通真实图片任务，再逐步扩成完整生产系统。</h1>
          <p className="hero-copy">
            上传素材、选择工作流、调用真实模型或本地处理链路，再把输出结果直接回写到项目里。
          </p>
        </div>
        <div className="hero-badges">
          <span>本地上传</span>
          <span>持久化存储</span>
          <span>批量处理</span>
          <span>模型路由</span>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="board-grid">
        <SectionCard title="队列通道" subtitle="即使本地运行，也保留生产级编排结构。">
          <div className="lane-list">
            {lanes.map((lane) => (
              <div key={lane.name} className="lane-row">
                <div>
                  <strong>{lane.name}</strong>
                  <p>{lane.description}</p>
                </div>
                <div className="lane-stats">
                  <span>{lane.waiting} waiting</span>
                  <span>{lane.running} running</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="模型路由" subtitle="模型始终通过能力标签和策略统一抽象。">
          <div className="model-list compact">
            {models.map((model) => (
              <div key={model.id} className="model-row">
                <div>
                  <strong>{model.name}</strong>
                  <p>
                    {model.provider} · {model.capabilities.join(" / ")}
                  </p>
                </div>
                <div className="model-meta">
                  <StatusPill tone={model.status === "active" ? "green" : "amber"}>
                    {model.status}
                  </StatusPill>
                  <span>{model.pricing}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="board-grid">
        <SectionCard title="最近任务" subtitle="新任务和输出结果会立即出现在这里。">
          <div className="job-list">
            {jobs.map((job) => (
              <article key={job.id} className="job-card">
                <div className="job-card-header">
                  <div>
                    <strong>{job.name}</strong>
                    <p>
                      {job.workflowName} · {job.itemCount} items
                    </p>
                  </div>
                  <StatusPill tone={job.statusTone}>{job.status}</StatusPill>
                </div>
                <div className="progress-bar">
                  <span style={{ width: `${job.progress}%` }} />
                </div>
                <div className="job-card-footer">
                  <span>{job.progress}% complete</span>
                  <span>{job.outputCount ?? 0} outputs</span>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="已发布工作流" subtitle="工作流会持久化保存，并可反复用于批量任务。">
          <div className="workflow-list">
            {workflows.map((workflow) => (
              <article key={workflow.id} className="workflow-card">
                <div className="workflow-topline">
                  <StatusPill tone="blue">v{workflow.version}</StatusPill>
                  <span>{workflow.trigger}</span>
                </div>
                <h3>{workflow.name}</h3>
                <p>{workflow.summary}</p>
                <div className="chip-row">
                  {workflow.steps.map((step) => (
                    <span key={step} className="chip">
                      {step}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
