import { ProviderKeysForm } from "@/components/provider-keys-form";
import { SectionCard } from "@/components/section-card";

const roleRows = [
  ["所有者", "组织管理、计费、模型白名单、审计总览"],
  ["管理员", "工作流发布、成员管理、Webhook、模板维护"],
  ["编辑者", "上传素材、创建任务、查看结果、重跑失败项"],
  ["只读者", "只读看板、结果预览、交付下载"],
];

export default function SettingsPage() {
  return (
    <div className="stack-xl">
      <section className="page-header">
        <div>
          <p className="eyebrow">系统设置</p>
          <h1>设置与模型接入</h1>
          <p>这里同时支持远程模型、本地 Ollama 识别，以及本地 Qwen 图片编辑 worker。</p>
        </div>
      </section>

      <section className="board-grid">
        <SectionCard
          title="模型配置"
          subtitle="Qwen-Image-Edit-2511 需要单独的本地 Python worker，不走 Ollama。"
        >
          <ProviderKeysForm />
        </SectionCard>

        <SectionCard title="角色权限" subtitle="先保留最基础的团队权限说明。">
          <div className="table-grid compact-table">
            <div className="table-row table-row-head">
              <span>角色</span>
              <span>权限范围</span>
            </div>
            {roleRows.map(([role, access]) => (
              <div key={role} className="table-row">
                <span>{role}</span>
                <span>{access}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="board-grid">
        <SectionCard title="本地模型说明" subtitle="把真实限制说清楚，不做假支持。">
          <div className="spec-list">
            <div>
              <strong>Ollama 的位置</strong>
              <p>当前只承担 OCR / 翻译识别，用来降低批量文本识别成本。</p>
            </div>
            <div>
              <strong>Qwen-Image-Edit-2511 的位置</strong>
              <p>这是独立的本地图像编辑模型，需要用 Hugging Face 方式加载，再通过本地 worker 暴露接口给这个平台。</p>
            </div>
            <div>
              <strong>当前主流程</strong>
              <p>任务页可直接选本地 Qwen 编辑模型；只要 worker 跑起来，前端就能像其他模型一样调用。</p>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
