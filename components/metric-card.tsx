import type { DashboardMetric } from "@/lib/platform-types";

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <article className="metric-card panel-card">
      <p className="eyebrow">{metric.label}</p>
      <h3>{metric.title}</h3>
      <strong>{metric.value}</strong>
      <p>{metric.description}</p>
      <span className="metric-trend">{metric.trend}</span>
    </article>
  );
}
