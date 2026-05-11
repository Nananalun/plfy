# 新机操作手册

这份文档只讲实际操作，不讲原理。目标是一台新的 Ubuntu GPU 云服务器，执行后把项目完整跑起来。

## 0. 你需要提前准备

- 项目代码目录 `web`
- 云服务器公网 IP
- 云服务器登录账号
- 一台带 GPU 的 Ubuntu 云机
- 如果 Hugging Face 模型仓库需要权限，准备好 `HF_TOKEN`
- 如果你还要保留远程备用模型，准备好：
  - `DASHSCOPE_API_KEY`
  - `OPENAI_API_KEY`
  - `GEMINI_API_KEY`

## 1. 登录云服务器

```bash
ssh user@你的服务器IP
```

## 2. 把项目放到云机上

你有两种常用方式，选一种就行。

### 方式 A：用 Git 直接下载

如果这个项目已经在 GitHub、GitLab 或 Gitee：

```bash
cd /srv
git clone <your-repo-url> frameflow
cd /srv/frameflow
ls
```

后面如果本地又改了代码，云机更新：

```bash
cd /srv/frameflow
git pull
```

### 方式 B：从本地电脑上传整个项目

如果你现在项目只在本地，没有推到 git 仓库，就直接上传。

本地是 Linux 或 macOS：

```bash
scp -r web user@你的服务器IP:/srv/frameflow
```

本地是 Windows PowerShell：

```powershell
scp -r C:\Users\Administrator\Desktop\web user@你的服务器IP:/srv/frameflow
```

上传后，在云机执行：

```bash
cd /srv/frameflow
ls
```

你应该能看到：

- `docker-compose.yml`
- `deploy`
- `workers`
- `app`

## 3. 安装基础环境

在云机执行：

```bash
cd /srv/frameflow
sudo bash deploy/ubuntu-bootstrap.sh
```

这个脚本会安装：

- Docker
- Docker Compose
- NVIDIA Container Toolkit

## 4. 检查 GPU 和 Docker GPU

在云机执行：

```bash
nvidia-smi
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

这两条都正常，再继续。

## 5. 准备环境变量

在云机执行：

```bash
cd /srv/frameflow
cp .env.deploy.example .env
nano .env
```

至少确认这些值：

```text
APP_PORT=3001
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_PORT=11434
OLLAMA_VISION_MODEL=qwen2.5vl:7b
QWEN_WORKER_PORT=8012
QWEN_IMAGE_WORKER_URL=http://qwen-worker:8012
QWEN_IMAGE_EDIT_MODEL=Qwen/Qwen-Image-Edit-2511
QWEN_PRELOAD_MODEL=1
QWEN_REQUEST_TIMEOUT_SECONDS=900
QWEN_MAX_CONCURRENT_REQUESTS=1
HF_TOKEN=
```

如果你还要远程备用模型，也可以填：

```text
DASHSCOPE_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
```

## 6. 启动服务

在云机执行：

```bash
cd /srv/frameflow
bash deploy/start-cloud.sh
```

首次启动会比较慢，因为会做这些事：

- 构建前端镜像
- 启动 `ollama`
- 用 `ollama-pull` 自动拉取视觉模型
- 安装 Python 依赖
- 下载 Qwen 模型权重

## 7. 查看启动状态

在云机执行：

```bash
docker compose ps
docker compose logs -f qwen-worker
```

看 Ollama 是否已经自动拉到模型：

```bash
docker compose logs -f ollama-pull
docker compose exec ollama ollama list
```

再检查 Qwen worker 健康状态：

```bash
curl http://127.0.0.1:8012/health
```

正常应该能看到类似字段：

- `ok`
- `device`
- `default_model`
- `loaded_model`

## 8. 打开页面

浏览器访问：

```text
http://你的服务器IP:3001
```

如果你想直接检查 Ollama：

```text
http://你的服务器IP:11434/api/tags
```

进入：

- `/settings`
- 确认 `Qwen 编辑 Worker 地址` 是 `http://qwen-worker:8012`，或者留空交给环境变量
- `/tasks`
- 选择 `Qwen 本地编辑`

## 9. 跑第一批任务

顺序：

1. 打开 `/tasks`
2. 上传几张测试图
3. 选择 `Qwen 本地编辑`
4. 写提示词
5. 点击生成
6. 在同页任务列表看结果
7. 用“下载全部”拿生成结果

## 10. 常用命令

查看容器：

```bash
docker compose ps
```

看前端日志：

```bash
docker compose logs -f app
```

看 Qwen worker 日志：

```bash
docker compose logs -f qwen-worker
```

看 Ollama 日志：

```bash
docker compose logs -f ollama
docker compose logs -f ollama-pull
```

重启：

```bash
docker compose restart
```

停止：

```bash
docker compose down
```

重建并启动：

```bash
docker compose up -d --build
```

## 11. 数据在哪里

这个项目的数据走 Docker 卷，主要包括：

- 任务和设置
- 上传图片
- 输出图片
- Hugging Face 模型缓存
- Ollama 模型缓存

所以即使重启容器，数据也不会直接丢。

## 12. 常见问题

### 1. worker 一直起不来

先看：

```bash
docker compose logs -f qwen-worker
```

常见原因：

- GPU 不可用
- 驱动和容器运行时没配好
- 模型下载失败
- 显存不够

### 2. 页面能打开，但生成失败

先看前端和 API 日志：

```bash
docker compose logs -f app
```

同时看 worker：

```bash
docker compose logs -f qwen-worker
```

### 3. 模型下载太慢

首次启动慢是正常现象。模型缓存会保存在卷里，后面不会每次重下。

如果是 Ollama 视觉模型还没下好：

```bash
docker compose logs -f ollama-pull
docker compose exec ollama ollama list
```

### 4. 并发太高把显存打爆

先不要调大：

```text
QWEN_MAX_CONCURRENT_REQUESTS=1
```

先稳住，再往上加。
