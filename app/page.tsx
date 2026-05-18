import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { toJobListItem } from "@/lib/job-list-view";
import { listJobs, listWorkflows } from "@/lib/mock-store";
import { getDashboardMetrics, getModels, getQueueLanes } from "@/lib/platform-data";

export default function DashboardPage() {
  const metrics = getDashboardMetrics();
  const jobs = listJobs().slice(0, 4).map(toJobListItem);
  const workflows = listWorkflows().slice(0, 3);
  const models = getModels().slice(0, 4);
  const lanes = getQueueLanes();

  return (
    <div className="stack-xl">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Batch AI Image Processing</p>
          <h1>Run real image jobs locally first, then scale the same workflow into production.</h1>
          <p className="hero-copy">
            Upload assets, select a workflow, call model providers or local runners, and persist generated outputs
            directly back into the project.
          </p>
        </div>
        <div className="hero-badges">
          <span>Local upload</span>
          <span>Persistent store</span>
          <span>Batch processing</span>
          <span>Model routing</span>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="board-grid">
        <SectionCard title="Queue Lanes" subtitle="The local runner keeps a production-style queue structure.">
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

        <SectionCard title="Model Routing" subtitle="Models are selected through shared capability and policy metadata.">
          <div className="model-list compact">
            {models.map((model) => (
              <div key={model.id} className="model-row">
                <div>
                  <strong>{model.name}</strong>
                  <p>
                    {model.provider} / {model.capabilities.join(" / ")}
                  </p>
                </div>
                <div className="model-meta">
                  <StatusPill tone={model.status === "active" ? "green" : "amber"}>{model.status}</StatusPill>
                  <span>{model.pricing}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="board-grid">
        <SectionCard title="Recent Jobs" subtitle="New tasks and outputs appear here as soon as they are persisted.">
          <div className="job-list">
            {jobs.map((job) => (
              <article key={job.id} className="job-card">
                <div className="job-card-header">
                  <div>
                    <strong>{job.name}</strong>
                    <p>
                      {job.workflowName} / {job.itemCount} items
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

        <SectionCard title="Published Workflows" subtitle="Workflows are persisted and can be reused for batch jobs.">
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
