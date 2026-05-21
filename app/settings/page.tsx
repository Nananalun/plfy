import { ProviderKeysForm } from "@/components/provider-keys-form";
import { SectionCard } from "@/components/section-card";

const roleRows = [
  ["Owner", "Organization management, billing, model allowlist, audit overview"],
  ["Admin", "Workflow publishing, member management, webhooks, template maintenance"],
  ["Editor", "Upload assets, create jobs, view results, retry failed items"],
  ["Viewer", "Read-only dashboards, result previews, delivery downloads"],
];

export default function SettingsPage() {
  return (
    <div className="stack-xl">
      <section className="page-header">
        <div>
          <p className="eyebrow">System Settings</p>
          <h1>Settings and Model Access</h1>
          <p>
            Configure remote providers, local Ollama recognition, and the local Qwen image editing worker.
          </p>
        </div>
      </section>

      <section className="board-grid">
        <SectionCard
          title="Model Configuration"
          subtitle="Qwen-Image-Edit-2511 uses a separate local Python worker and does not run through Ollama."
        >
          <ProviderKeysForm />
        </SectionCard>

        <SectionCard title="Role Permissions" subtitle="Basic team permissions are kept here for reference.">
          <div className="table-grid compact-table">
            <div className="table-row table-row-head">
              <span>Role</span>
              <span>Access</span>
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
        <SectionCard
          title="Local Model Notes"
          subtitle="This section documents the current local model boundaries."
        >
          <div className="spec-list">
            <div>
              <strong>Ollama</strong>
              <p>Currently used for OCR and translation recognition to reduce batch text recognition cost.</p>
            </div>
            <div>
              <strong>Qwen-Image-Edit-2511</strong>
              <p>
                Runs as an independent local image editing worker loaded through Hugging Face and exposed to this app
                through a local HTTP endpoint.
              </p>
            </div>
            <div>
              <strong>Current Flow</strong>
              <p>
                Tasks can select the local Qwen editing model directly. Once the worker is running, the frontend calls it
                like the other configured providers.
              </p>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
