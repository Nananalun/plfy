# 一键部署

适合完全空白的新 Ubuntu GPU 云机。

前提只有两个：

- 这台机器已经装好 NVIDIA 驱动，`nvidia-smi` 能正常输出
- 你能用 `ssh` 登上这台机器

## 最简单用法

登录云机后，直接执行：

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/Nananalun/plfy/master/deploy/install-on-new-ubuntu.sh)"
```

这条命令会自动完成：

- 安装 git
- 克隆项目到 `/srv/frameflow`
- 安装 Docker / Docker Compose / NVIDIA Container Toolkit
- 生成 `.env`
- 启动前端、Ollama、Qwen worker
- 自动拉取 Ollama 视觉模型

## 如果你还要带上密钥

例如：

```bash
sudo OPENAI_API_KEY=你的key HF_TOKEN=你的token bash -c "$(curl -fsSL https://raw.githubusercontent.com/Nananalun/plfy/master/deploy/install-on-new-ubuntu.sh)"
```

## 启动后访问

- 前端：`http://你的云机IP:3001`
- Ollama：`http://你的云机IP:11434/api/tags`
- Qwen 健康检查：`http://你的云机IP:8012/health`

## 看日志

```bash
cd /srv/frameflow
docker compose logs -f ollama-pull
docker compose logs -f qwen-worker
docker compose logs -f app
```

## 重要限制

这不是“任何机器都能跑”的零条件脚本。

必须满足：

- Ubuntu
- NVIDIA GPU
- NVIDIA 驱动已安装
- 显存基本够用

如果 `nvidia-smi` 都没有，这个脚本会直接停下，因为后面继续跑也没意义。
