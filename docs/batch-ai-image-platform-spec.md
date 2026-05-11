# 批量 AI 图片编辑平台设计方案

## 1. 目标

构建一个包含前后端的 AI 图片编辑平台，支持大批量处理、模型自主选择、流程编排、多人协作、权限隔离和后续自由扩展。平台不是单一“调某个模型的页面”，而是一个可运营、可接第三方模型、可做企业级批处理的系统。

## 2. 产品定位

- 面向电商、摄影、广告、设计、内容工厂、自媒体工作室
- 支持单图编辑，也支持批量任务和自动流水线
- 支持自有模型、第三方模型、开源模型混合接入
- 支持“手动编辑模式”和“规则驱动批处理模式”

## 3. 核心能力

### 3.1 图片输入

- 本地拖拽上传
- ZIP 批量上传
- 文件夹批量导入
- 云存储导入
  - S3
  - OSS
  - COS
  - 七牛
- URL 拉取
- API 直传

### 3.2 编辑能力

- 文生图重绘
- 局部重绘 Inpainting
- 局部擦除/替换
- 去背景
- 换背景
- 抠图
- 超分辨率
- 修复模糊
- 扩图 Outpainting
- 风格迁移
- 批量加文案/贴纸/水印
- 批量裁剪
- 批量改尺寸
- 人像美化
- 商品图规范化
- 多图统一风格
- 智能生成多版本

### 3.3 批处理能力

- 批量任务创建
- 任务模板保存
- 条件规则分流
- 多步骤流水线
- 失败自动重试
- 任务回滚
- 并发控制
- 优先级队列
- 定时任务
- 断点续跑
- 结果自动打包导出

### 3.4 模型自由选择

- 用户可以按任务选择模型
- 用户可以按步骤选择模型
- 用户可以设置模型回退链路
- 用户可以按成本/速度/质量策略自动路由
- 支持自定义模型参数透传
- 支持企业管理员配置可用模型白名单

### 3.5 组织与权限

- 多租户
- 团队空间
- 成员角色
  - Owner
  - Admin
  - Editor
  - Viewer
  - Finance
- API Key 管理
- 操作审计
- 敏感素材访问隔离

### 3.6 交付与输出

- 单张下载
- 批量下载
- ZIP 导出
- 推送回对象存储
- Webhook 通知
- 结果回传第三方业务系统
- 导出处理报告

## 4. 用户端功能设计

### 4.1 控制台

- 今日任务概览
- 任务成功率
- 平均耗时
- 模型成本
- 队列状态
- GPU/Worker 使用率

### 4.2 素材管理

- 原图库
- 结果图库
- 标签
- 批次
- 搜索
- 去重
- 元数据查看

### 4.3 工作流编辑器

采用节点式流程设计，适合“功能要全、要自由”的要求。

节点示例：

- 读入图片
- 预处理
- 去背景
- Prompt 构造
- 调用模型
- 结果质检
- 失败分支
- 输出存储
- 回调通知

### 4.4 批量任务页

- 任务创建
- 任务筛选
- 失败重跑
- 部分重跑
- 单图预览
- 批次维度统计

### 4.5 Prompt 与模板中心

- Prompt 模板库
- 变量占位符
- 品牌风格模板
- 电商规格模板
- 团队共享模板
- 版本管理

## 5. 前端架构

推荐技术栈：

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- React Flow
- shadcn/ui 或自建设计系统

前端模块：

### 5.1 页面结构

- `/login`
- `/dashboard`
- `/assets`
- `/tasks`
- `/tasks/[id]`
- `/workflows`
- `/workflows/[id]`
- `/models`
- `/templates`
- `/settings`
- `/billing`
- `/audit`

### 5.2 组件层

- 批量上传器
- 图片预览对比器
- 区域蒙版编辑器
- 工作流节点画布
- 模型选择器
- 参数面板
- 队列状态卡片
- 成本统计图表

### 5.3 前端状态

- 会话状态
- 当前工作空间
- 上传队列
- 批量任务草稿
- Workflow 草稿
- 实时任务状态

### 5.4 实时通信

- SSE 用于任务进度推送
- WebSocket 用于节点运行状态和多人协作

## 6. 后端架构

推荐拆成 6 个核心服务。

### 6.1 API Gateway

职责：

- 统一鉴权
- 请求限流
- 路由聚合
- API 版本管理

推荐：

- Next.js Route Handlers 或 NestJS

### 6.2 Auth / Tenant Service

职责：

- 登录注册
- 团队管理
- RBAC
- API Key
- 审计日志

### 6.3 Asset Service

职责：

- 上传
- 元数据提取
- 存储路径管理
- 版本管理
- 缩略图生成

### 6.4 Workflow Service

职责：

- 工作流定义
- 模板版本
- 节点参数校验
- 执行计划编译

### 6.5 Job Orchestrator

职责：

- 批量任务拆分
- 节点调度
- 重试
- 优先级控制
- 幂等执行
- 失败恢复

### 6.6 Model Gateway

职责：

- 对接不同模型供应方
- 统一输入输出
- 参数映射
- 结果标准化
- 成本统计
- 降级与回退

## 7. 推荐基础设施

- PostgreSQL: 业务主库
- Redis: 队列、缓存、限流、分布式锁
- S3 兼容对象存储: 原图、结果图、蒙版、ZIP
- BullMQ / Temporal: 异步任务编排
- ClickHouse: 大规模任务日志和分析
- MinIO: 本地开发对象存储
- Prometheus + Grafana: 监控
- Sentry: 异常追踪

## 8. 模型接入设计

必须把“模型”抽象成统一协议，而不是在业务代码里硬编码供应商。

### 8.1 统一模型接口

```ts
type ImageEditRequest = {
  provider: string;
  model: string;
  capability:
    | "inpaint"
    | "outpaint"
    | "background-remove"
    | "upscale"
    | "style-transfer"
    | "text-to-image"
    | "image-to-image";
  prompt?: string;
  negativePrompt?: string;
  imageUrls: string[];
  maskUrl?: string;
  outputCount?: number;
  aspectRatio?: string;
  quality?: "fast" | "balanced" | "best";
  extra?: Record<string, unknown>;
};

type ImageEditResult = {
  jobId: string;
  providerJobId?: string;
  status: "queued" | "running" | "succeeded" | "failed";
  outputs: Array<{
    url: string;
    width: number;
    height: number;
    seed?: number;
  }>;
  usage?: {
    inputImages: number;
    outputImages: number;
    gpuSeconds?: number;
    costUsd?: number;
  };
  raw?: Record<string, unknown>;
};
```

### 8.2 模型适配器

每个供应商写一个 adapter：

- `openai-image.adapter.ts`
- `replicate.adapter.ts`
- `stability.adapter.ts`
- `fal.adapter.ts`
- `comfyui.adapter.ts`
- `custom-sdxl.adapter.ts`

### 8.3 模型注册表

注册信息包含：

- 模型 ID
- 供应商
- 能力标签
- 输入限制
- 输出格式
- 计费规则
- 默认参数
- 是否可商用
- 是否支持批量
- 是否支持蒙版

### 8.4 智能路由策略

可按以下策略自动选模型：

- 最低成本
- 最快响应
- 最佳质量
- 指定品牌风格
- 按图片类型
  - 人像
  - 商品
  - 海报
  - 插画

## 9. 批处理执行链路

### 9.1 任务流

1. 用户上传素材
2. 创建批量任务
3. 选择工作流模板
4. 为每一步指定模型或自动路由策略
5. 系统拆分成 N 个子任务
6. Job Orchestrator 推入队列
7. Worker 按步骤执行
8. 结果回写对象存储
9. 质检和统计
10. 通知用户完成

### 9.2 队列设计

建议至少分为：

- `upload-processing`
- `image-preprocess`
- `image-edit`
- `quality-check`
- `result-export`
- `webhook-delivery`

### 9.3 Worker 设计

不同 Worker 负责不同能力：

- 轻量 Worker: 缩略图、裁剪、格式转换
- AI Worker: 调模型接口
- GPU Worker: 自建模型推理
- Export Worker: 打包导出与通知

## 10. 数据库核心表

### 10.1 用户与组织

- `users`
- `organizations`
- `organization_members`
- `api_keys`

### 10.2 素材

- `assets`
- `asset_versions`
- `asset_tags`
- `asset_batches`

### 10.3 工作流

- `workflows`
- `workflow_versions`
- `workflow_nodes`
- `workflow_edges`
- `workflow_templates`

### 10.4 任务

- `jobs`
- `job_items`
- `job_steps`
- `job_attempts`
- `job_outputs`

### 10.5 模型

- `model_providers`
- `models`
- `model_capabilities`
- `model_usage_logs`
- `model_fallback_rules`

### 10.6 运营

- `billing_records`
- `credit_wallets`
- `webhook_endpoints`
- `audit_logs`

## 11. API 设计

### 11.1 素材相关

- `POST /api/assets/upload`
- `POST /api/assets/import-url`
- `GET /api/assets`
- `GET /api/assets/:id`

### 11.2 工作流相关

- `POST /api/workflows`
- `GET /api/workflows`
- `GET /api/workflows/:id`
- `POST /api/workflows/:id/publish`

### 11.3 任务相关

- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `POST /api/jobs/:id/retry`
- `POST /api/jobs/:id/cancel`
- `GET /api/jobs/:id/stream`

### 11.4 模型相关

- `GET /api/models`
- `POST /api/models/test-run`
- `POST /api/models/route-preview`

### 11.5 平台集成

- `POST /api/webhooks`
- `POST /api/external/submit-job`
- `GET /api/external/jobs/:id`

## 12. 工作流 DSL

为了自由度，建议工作流保存为 JSON DSL。

```json
{
  "name": "ecommerce-background-refresh",
  "version": 3,
  "nodes": [
    {
      "id": "load-assets",
      "type": "asset-input"
    },
    {
      "id": "remove-bg",
      "type": "model-step",
      "config": {
        "capability": "background-remove",
        "routing": {
          "mode": "quality-first"
        }
      }
    },
    {
      "id": "replace-bg",
      "type": "model-step",
      "config": {
        "capability": "inpaint",
        "model": "provider_x/model_y",
        "promptTemplate": "replace background with clean soft studio lighting"
      }
    },
    {
      "id": "export",
      "type": "output"
    }
  ],
  "edges": [
    ["load-assets", "remove-bg"],
    ["remove-bg", "replace-bg"],
    ["replace-bg", "export"]
  ]
}
```

## 13. 成本与计费

系统如果要商用，计费必须一开始就设计进去。

支持：

- 按张计费
- 按任务计费
- 按模型成本加价
- 按会员套餐
- 按团队配额
- 预充值
- 月结

统计维度：

- 每模型成本
- 每组织成本
- 每工作流成本
- 每批次成本
- 单图平均成本

## 14. 质检体系

不能只做“生成成功”，还要做“结果可用”。

建议增加自动质检：

- 分辨率检查
- NSFW 检查
- 人脸完整度检查
- 背景残留检查
- 水印检测
- 清晰度评分
- Prompt 合规检查

可设置：

- 自动通过
- 自动打回重跑
- 转人工审核

## 15. 安全与合规

- 上传文件类型校验
- 病毒扫描
- EXIF 清洗
- 存储加密
- 细粒度权限控制
- 审计日志
- 临时签名 URL
- 第三方模型调用脱敏
- Prompt 敏感词策略

## 16. MVP 与分阶段建设

### Phase 1: 可上线 MVP

- 登录
- 图片上传
- 批量任务
- 2 到 3 个模型接入
- 单工作流模板
- 任务列表
- 结果下载
- 基础计费统计

### Phase 2: 平台化

- 工作流编辑器
- 模型路由策略
- Webhook
- API 接入
- 团队权限
- 模板市场

### Phase 3: 企业版

- 多租户隔离
- 专属模型
- 自建 GPU Worker
- 审批流
- 私有化部署

## 17. 推荐技术选型

如果你追求开发效率和后续扩展，我建议：

- 前端: Next.js + TypeScript + Tailwind + Zustand + React Flow
- API: Next.js Route Handlers 或 NestJS
- 异步任务: BullMQ
- 数据库: PostgreSQL
- 缓存/队列: Redis
- 存储: S3 / MinIO
- 日志分析: ClickHouse
- 监控: Prometheus + Grafana

## 18. 最关键的设计原则

- 模型接入必须适配器化
- 工作流必须 DSL 化
- 批处理必须异步队列化
- 存储必须对象化
- 任务必须可恢复、可重跑、可审计
- 前端必须支持节点编排和批量预览
- 计费和日志不能后补

## 19. 适合你的最终形态

如果你的目标是“功能要全、要自由”，最合适的不是单体图片工具，而是：

一个“AI 图片处理操作系统”。

它应该具备：

- 面向用户的可视化前端
- 面向运营的模型与成本后台
- 面向机器的开放 API
- 面向批处理的任务编排引擎
- 面向未来的模型路由层

## 20. 下一步建议

如果继续往下做，建议直接输出 3 份落地物：

1. 产品原型图
2. 数据库 ER 设计
3. Next.js + Node + Redis + Postgres 的项目骨架

这样就不是停留在概念方案，而是可以马上进入开发。
