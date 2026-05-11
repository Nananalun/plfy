import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { WorkflowCreator } from "@/components/workflow-creator";
import { getWorkflowDslExample } from "@/lib/platform-data";
import { listWorkflows } from "@/lib/mock-store";

export default function WorkflowsPage() {
  const workflows = listWorkflows();
  const dsl = JSON.stringify(getWorkflowDslExample(), null, 2);

  return (
    <div className="stack-xl">
      <section className="page-header">
        <div>
          <p className="eyebrow">Workflow Studio</p>
          <h1>工作流编辑器</h1>
          <p>模型选择不是页面字段，而是节点能力。每个节点都可独立指定 provider、回退和质检规则。</p>
        </div>
      </section>

      <section className="workflow-grid">
        <SectionCard title="发布流程" subtitle="把批处理规则抽成可复用模板。">
          <WorkflowCreator />
        </SectionCard>

        <SectionCard title="DSL 结构" subtitle="最终存的是 JSON，而不是画布截图。">
          <pre className="code-block">
            <code>{dsl}</code>
          </pre>
        </SectionCard>
      </section>

      <section className="board-grid">
        <SectionCard title="已发布流程" subtitle="从单图编辑升级成批量规则引擎。">
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

        <SectionCard title="设计原则" subtitle="保证后续能接真实队列和真实模型。">
          <div className="spec-list">
            <div>
              <strong>DSL 持久化</strong>
              <p>页面画布只是编辑器，最终应保存为节点和边的结构化定义。</p>
            </div>
            <div>
              <strong>版本管理</strong>
              <p>任务引用 workflow version，避免历史批次被新规则污染。</p>
            </div>
            <div>
              <strong>步骤级路由</strong>
              <p>不同 step 可以绑定不同模型能力和回退策略，而不是一单一模型。</p>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
