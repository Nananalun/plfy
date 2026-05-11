# 云端部署说明

这套项目已经整理成适合迁移到空白云主机的结构：
- `app`：Next.js 前端与 API
- `qwen-worker`：本地 `Qwen/Qwen-Image-Edit-2511` 图像编辑服务
- `docker-compose.yml`：统一编排
- `deploy/ubuntu-bootstrap.sh`：新机基础环境安装
- `deploy/start-cloud.sh`：项目启动脚本

## 目标机最低前提

如果你要跑 `Qwen/Qwen-Image-Edit-2511`，目标机不能真的是“完全什么都没有”，至少要有：
- Linux
- NVIDIA 驱动
- Docker Engine
- Docker Compose 插件
- NVIDIA Container Toolkit
- 一张可用 GPU

如果没有 GPU，这个模型不适合实际批量生产。

## 建议机器

- 系统：Ubuntu 22.04 或 24.04
- CUDA 驱动：与宿主机 GPU 匹配
- 显存：至少从 24GB 起步更稳
- 磁盘：建议预留 100GB+

## 部署步骤

### 1. 上传项目

把整个 `web` 目录传到云主机，例如：

```bash
scp -r web user@your-server:/srv/frameflow
```

### 2. 安装宿主机基础环境

首次上机后：

```bash
cd /srv/frameflow
sudo bash deploy/ubuntu-bootstrap.sh
```

### 3. 准备环境文件

```bash
cd /srv/frameflow
cp .env.deploy.example .env
```

按需修改：
- `DASHSCOPE_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `QWEN_IMAGE_EDIT_MODEL`
- `HF_TOKEN`

默认情况下：

```text
QWEN_IMAGE_WORKER_URL=http://qwen-worker:8012
```

这表示容器内部直接调用同 Compose 网络下的 worker。

### 4. 启动

```bash
bash deploy/start-cloud.sh
```

### 5. 检查服务

```bash
docker compose ps
docker compose logs -f qwen-worker
docker compose logs -f app
```

Worker 健康检查：

```bash
curl http://127.0.0.1:8012/health
```

前端地址：

```text
http://your-server-ip:3001
```

## 持久化

Compose 已经给你分了卷：
- `frameflow-data`
- `frameflow-uploads`
- `frameflow-outputs`
- `huggingface-cache`

作用分别是：
- 保存任务、素材、设置
- 保存上传图片
- 保存生成结果
- 保存 Hugging Face 模型缓存，避免重下

## 迁移优势

当前结构迁移时不依赖本机 Python 虚拟环境，也不依赖本机 Node 环境：
- 目标机只要有 Docker
- worker 依赖在容器里安装
- Next.js 依赖在容器里安装
- 模型缓存走独立卷

## 真实限制

`Qwen/Qwen-Image-Edit-2511` 的具体加载参数、显存占用和推理速度，仍然取决于：
- 目标机 GPU
- 宿主机驱动
- `torch / diffusers / transformers` 版本兼容性

所以现在这一步是“把迁移结构搭好”，不是宣称任何机器都能零条件跑起来。
