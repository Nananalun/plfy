import Image from "next/image";
import { AssetUploader } from "@/components/asset-uploader";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getIngestionChannels } from "@/lib/platform-data";
import { listAssets } from "@/lib/mock-store";

export default function AssetsPage() {
  const assets = listAssets();
  const channels = getIngestionChannels();

  return (
    <div className="stack-xl">
      <section className="page-header">
        <div>
          <p className="eyebrow">素材中心</p>
          <h1>素材中心</h1>
          <p>现在可以直接从浏览器上传文件到本地项目目录，上传后会立即写入项目数据文件并出现在列表里。</p>
        </div>
      </section>

      <section className="board-grid">
        <SectionCard title="上传素材" subtitle="当前默认写入本地 `public/uploads`，无需额外服务。">
          <AssetUploader />
        </SectionCard>

        <SectionCard title="导入通道" subtitle="浏览器上传已可用，其余通道保留为后续扩展。">
          <div className="channel-grid">
            {channels.map((channel) => (
              <article key={channel.name} className="channel-card">
                <strong>{channel.name}</strong>
                <p>{channel.description}</p>
                <StatusPill tone="blue">{channel.mode}</StatusPill>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="asset-grid">
        {assets.map((asset) => (
          <article key={asset.id} className="asset-card">
            <div className="asset-preview media-preview">
              {asset.previewUrl ? (
                <Image src={asset.previewUrl} alt={asset.name} fill sizes="(max-width: 980px) 100vw, 30vw" />
              ) : (
                <span>{asset.kind}</span>
              )}
            </div>
            <div className="asset-content">
              <div className="asset-title">
                <strong>{asset.name}</strong>
                <StatusPill tone={asset.statusTone}>{asset.status}</StatusPill>
              </div>
              <p>
                {asset.dimensions}
                {asset.source ? ` · ${asset.source}` : ""}
                {asset.batchLabel ? ` · ${asset.batchLabel}` : ""}
              </p>
              <div className="chip-row">
                {asset.tags.length ? (
                  asset.tags.map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="chip">未打标签</span>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
