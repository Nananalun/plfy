import type {
  Asset,
  DashboardMetric,
  IngestionChannel,
  Job,
  ModelDefinition,
  QueueLane,
  RoutingPolicy,
  Workflow,
} from "@/lib/platform-types";

const dashboardMetrics: DashboardMetric[] = [
  {
    label: "Throughput",
    title: "24h 处理量",
    value: "18,240",
    description: "包含抠图、局部重绘、扩图和统一导出任务。",
    trend: "+12.4% vs yesterday",
  },
  {
    label: "Reliability",
    title: "任务成功率",
    value: "97.8%",
    description: "失败任务可按 step 重试，不需要整批回滚。",
    trend: "retry recovery 81%",
  },
  {
    label: "Latency",
    title: "平均交付耗时",
    value: "4m 26s",
    description: "已包含入队、推理、质检、打包和回调通知。",
    trend: "-38s after lane split",
  },
  {
    label: "Spend",
    title: "模型成本",
    value: "$1,284",
    description: "按组织、工作流、模型和能力维度聚合统计。",
    trend: "quality-first jobs 41%",
  },
];

const queueLanes: QueueLane[] = [
  {
    name: "upload-processing",
    description: "文件解析、去重、EXIF 清洗、缩略图生成。",
    waiting: 28,
    running: 6,
    sla: "< 40s",
  },
  {
    name: "image-edit",
    description: "AI 模型执行区，支持 provider fallback 和 cost routing。",
    waiting: 134,
    running: 24,
    sla: "< 6m",
  },
  {
    name: "quality-check",
    description: "清晰度、蒙版残留、分辨率和合规检测。",
    waiting: 15,
    running: 4,
    sla: "< 90s",
  },
  {
    name: "result-export",
    description: "结果打包、对象存储回传、Webhook 交付。",
    waiting: 9,
    running: 2,
    sla: "< 2m",
  },
];

const jobs: Job[] = [
  {
    id: "job_1024",
    name: "春季商品主图翻新",
    workflowName: "Catalog Background Refresh",
    itemCount: 1200,
    progress: 74,
    status: "running",
    statusTone: "blue",
    routingPolicy: "quality-first",
  },
  {
    id: "job_1025",
    name: "短视频封面批量出图",
    workflowName: "Creator Thumbnail Boost",
    itemCount: 360,
    progress: 100,
    status: "succeeded",
    statusTone: "green",
    routingPolicy: "speed-first",
  },
  {
    id: "job_1026",
    name: "品牌海报局部重绘",
    workflowName: "Campaign Inpaint Review",
    itemCount: 96,
    progress: 58,
    status: "waiting-review",
    statusTone: "amber",
    routingPolicy: "human-in-loop",
  },
  {
    id: "job_1027",
    name: "旧图超分修复",
    workflowName: "Archive Restoration",
    itemCount: 4200,
    progress: 21,
    status: "running",
    statusTone: "blue",
    routingPolicy: "cost-balanced",
  },
];

const workflows: Workflow[] = [
  {
    id: "wf_01",
    name: "Catalog Background Refresh",
    version: 12,
    trigger: "SKU intake",
    summary: "读入商品图后自动抠图、换背景、加阴影并导出电商规格。",
    steps: ["asset-input", "remove-bg", "inpaint-bg", "quality-check", "export"],
  },
  {
    id: "wf_02",
    name: "Campaign Inpaint Review",
    version: 6,
    trigger: "creative brief",
    summary: "广告海报局部替换后进入质检和人工复核，再统一打包交付。",
    steps: ["asset-input", "mask-merge", "inpaint", "human-review", "export"],
  },
  {
    id: "wf_03",
    name: "Creator Thumbnail Boost",
    version: 4,
    trigger: "batch upload",
    summary: "统一人物肤感、强化主体、批量生成 3 个封面版本。",
    steps: ["normalize", "retouch", "variant-generate", "upscale", "export"],
  },
  {
    id: "wf_04",
    name: "Archive Restoration",
    version: 3,
    trigger: "scheduled job",
    summary: "低清图自动修复、放大、去噪并归档到对象存储。",
    steps: ["ingest", "denoise", "upscale", "quality-check", "archive"],
  },
];

const models: ModelDefinition[] = [
  {
    id: "model_01",
    name: "VisionForge Edit XL",
    provider: "OpenAI Gateway",
    capabilities: ["inpaint", "image-to-image", "style-transfer", "translate-zh-en", "redraw-translate-zh-en"],
    status: "active",
    pricing: "$0.09 / image",
    latency: "2.3s avg",
  },
  {
    id: "model_00",
    name: "Gemini Vision Translator",
    provider: "Gemini Gateway",
    capabilities: ["translate-zh-en", "ocr-layout", "vision-analysis"],
    status: "active",
    pricing: "API-based",
    latency: "1.8s avg",
  },
  {
    id: "model_00b",
    name: "Ollama Vision Translator",
    provider: "Local Ollama",
    capabilities: ["translate-zh-en", "ocr-layout", "vision-analysis"],
    status: "active",
    pricing: "local GPU / CPU",
    latency: "depends on device",
  },
  {
    id: "model_00c",
    name: "Qwen Image Edit 2511",
    provider: "Local HF Worker",
    capabilities: ["image-edit", "redraw-translate-zh-en", "poster-redraw"],
    status: "active",
    pricing: "local GPU",
    latency: "depends on device",
  },
  {
    id: "model_07",
    name: "Tongyi Wanxiang Edit",
    provider: "DashScope Gateway",
    capabilities: ["image-edit", "redraw-translate-zh-en", "poster-redraw"],
    status: "active",
    pricing: "API-based",
    latency: "3.6s avg",
  },
  {
    id: "model_02",
    name: "RapidCut BG-2",
    provider: "Internal GPU Cluster",
    capabilities: ["background-remove", "mask-extract"],
    status: "active",
    pricing: "$0.01 / image",
    latency: "640ms avg",
  },
  {
    id: "model_03",
    name: "PosterFill Pro",
    provider: "Replicate Adapter",
    capabilities: ["inpaint", "outpaint"],
    status: "active",
    pricing: "$0.12 / image",
    latency: "5.4s avg",
  },
  {
    id: "model_04",
    name: "Clarity Upscaler 4x",
    provider: "Fal Adapter",
    capabilities: ["upscale", "restore"],
    status: "active",
    pricing: "$0.04 / image",
    latency: "3.1s avg",
  },
  {
    id: "model_05",
    name: "Studio Retouch Lite",
    provider: "ComfyUI Worker",
    capabilities: ["beauty", "skin-retouch"],
    status: "limited",
    pricing: "$0.03 / image",
    latency: "7.8s avg",
  },
  {
    id: "model_06",
    name: "Brand Style Router",
    provider: "Policy Engine",
    capabilities: ["route-selection"],
    status: "active",
    pricing: "policy-based",
    latency: "<100ms",
  },
];

const assets: Asset[] = [
  {
    id: "asset_01",
    name: "sku-hoodie-black-front.png",
    kind: "PNG",
    dimensions: "2400 x 2400",
    status: "ready",
    statusTone: "green",
    tags: ["apparel", "catalog", "transparent-mask"],
    source: "seed",
  },
  {
    id: "asset_02",
    name: "campaign-poster-spring-01.jpg",
    kind: "JPG",
    dimensions: "3840 x 2160",
    status: "review",
    statusTone: "amber",
    tags: ["campaign", "inpaint", "brand-check"],
    source: "seed",
  },
  {
    id: "asset_03",
    name: "creator-batch-cover-18.webp",
    kind: "WEBP",
    dimensions: "1280 x 720",
    status: "processing",
    statusTone: "blue",
    tags: ["thumbnail", "batch", "variant-set"],
    source: "seed",
  },
  {
    id: "asset_04",
    name: "archive-scan-1942.tif",
    kind: "TIF",
    dimensions: "5200 x 3800",
    status: "queued",
    statusTone: "red",
    tags: ["archive", "restore", "high-res"],
    source: "seed",
  },
  {
    id: "asset_05",
    name: "cosmetic-flatlay-07.png",
    kind: "PNG",
    dimensions: "3000 x 3000",
    status: "ready",
    statusTone: "green",
    tags: ["beauty", "flatlay", "shadow-pass"],
    source: "seed",
  },
  {
    id: "asset_06",
    name: "kitchen-set-batch-b.zip",
    kind: "ZIP",
    dimensions: "82 images",
    status: "ingested",
    statusTone: "blue",
    tags: ["zip-import", "multi-sku", "scheduled"],
    source: "seed",
  },
];

const ingestionChannels: IngestionChannel[] = [
  {
    name: "Browser Upload",
    description: "拖拽上传单图、多图或 ZIP，适合人工批次启动。",
    mode: "manual",
  },
  {
    name: "S3 / OSS Sync",
    description: "按 bucket 路径持续监听，把对象存储当成素材入口。",
    mode: "sync",
  },
  {
    name: "External API",
    description: "第三方系统直接提交任务，拿 job id 和 Webhook 回调。",
    mode: "programmatic",
  },
  {
    name: "Scheduled Import",
    description: "定时拉取指定目录或 URL 列表，自动生成批次任务。",
    mode: "scheduled",
  },
];

const routingPolicies: RoutingPolicy[] = [
  {
    name: "quality-first",
    description: "优先命中高质量模型，失败后按可接受成本降级。",
  },
  {
    name: "speed-first",
    description: "优先压缩总处理时间，用于封面、直播图等时效场景。",
  },
  {
    name: "cost-balanced",
    description: "按能力拆步骤，昂贵模型只用在关键节点。",
  },
  {
    name: "human-in-loop",
    description: "关键步骤后进入人工审核，再决定是否继续下游导出。",
  },
];

export function getDashboardMetrics() {
  return dashboardMetrics;
}

export function getQueueLanes() {
  return queueLanes;
}

export function getJobs() {
  return jobs;
}

export function getWorkflows() {
  return workflows;
}

export function getModels() {
  return models;
}

export function getAssets() {
  return assets;
}

export function getIngestionChannels() {
  return ingestionChannels;
}

export function getRoutingPolicies() {
  return routingPolicies;
}

export function getWorkflowDslExample() {
  return {
    name: "catalog-background-refresh",
    version: 12,
    nodes: [
      { id: "asset-input", type: "asset-input" },
      {
        id: "remove-bg",
        type: "model-step",
        config: {
          capability: "background-remove",
          routing: { mode: "cost-balanced" },
        },
      },
      {
        id: "replace-bg",
        type: "model-step",
        config: {
          capability: "inpaint",
          model: "VisionForge Edit XL",
          promptTemplate: "replace with clean studio background and soft shadow",
        },
      },
      { id: "quality-check", type: "quality-check" },
      { id: "export", type: "output" },
    ],
    edges: [
      ["asset-input", "remove-bg"],
      ["remove-bg", "replace-bg"],
      ["replace-bg", "quality-check"],
      ["quality-check", "export"],
    ],
  };
}
