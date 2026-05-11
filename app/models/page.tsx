import { RoutePreview } from "@/components/route-preview";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getModels, getRoutingPolicies } from "@/lib/platform-data";

export default function ModelsPage() {
  const models = getModels();
  const policies = getRoutingPolicies();

  return (
    <div className="stack-xl">
      <section className="page-header">
        <div>
          <p className="eyebrow">模型网关</p>
          <h1>模型中心</h1>
          <p>模型以统一协议注册。前台只关心能力、限制、成本和 SLA，不关心底层供应商差异。</p>
        </div>
      </section>

      <section className="board-grid">
        <SectionCard title="模型注册表" subtitle="统一接口，适配多种能力。">
          <div className="model-list">
            {models.map((model) => (
              <article key={model.id} className="model-card">
                <div className="model-head">
                  <div>
                    <strong>{model.name}</strong>
                    <p>{model.provider}</p>
                  </div>
                  <StatusPill tone={model.status === "active" ? "green" : "amber"}>
                    {model.status}
                  </StatusPill>
                </div>
                <div className="chip-row">
                  {model.capabilities.map((capability) => (
                    <span key={capability} className="chip">
                      {capability}
                    </span>
                  ))}
                </div>
                <div className="model-foot">
                  <span>{model.pricing}</span>
                  <span>{model.latency}</span>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="路由预览" subtitle="先预估会命中哪个模型，再决定是否发任务。">
          <RoutePreview />
        </SectionCard>
      </section>

      <section className="board-grid">
        <SectionCard title="路由策略" subtitle="给业务方提供结果，不要求他们理解模型差异。">
          <div className="spec-list">
            {policies.map((policy) => (
              <div key={policy.name}>
                <strong>{policy.name}</strong>
                <p>{policy.description}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="适配器设计" subtitle="后续接真实模型时，业务层不用跟着改。">
          <pre className="code-block">
            <code>{`type ImageEditRequest = {
  provider: string;
  model: string;
  capability: "inpaint" | "outpaint" | "background-remove" | "upscale";
  prompt?: string;
  imageUrls: string[];
  maskUrl?: string;
};`}</code>
          </pre>
        </SectionCard>
      </section>
    </div>
  );
}
