# FrameFlow AI

一个面向批量 AI 图片编辑的本地化工作台，当前主流程集中在 `/tasks`：
- 直接上传多张图片
- 选择模型
- 写提示词
- 批量生成
- 在同页查看、管理和下载任务结果

## 当前已接入

- 通义万相图片编辑
- OpenAI 图片编辑
- Ollama 本地视觉识别
- Qwen `Qwen/Qwen-Image-Edit-2511` 本地 worker 接口

## 运行前端

```bash
npm run dev
```

默认地址：

```text
http://localhost:3001
```

## 模型配置

在 `/settings` 页面可以直接填写：
- OpenAI API Key
- Gemini API Key
- 通义万相 API Key
- Ollama 地址与视觉模型
- Qwen 编辑 Worker 地址

配置保存在本地：

```text
data/provider-secrets.json
```

## 本地 Qwen Image Edit Worker

`Qwen/Qwen-Image-Edit-2511` 不走 Ollama，需要单独启动 Python worker。

文件位置：

```text
workers/qwen_image_edit_worker.py
workers/requirements-qwen-image-edit.txt
```

示例步骤：

```bash
cd workers
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-qwen-image-edit.txt
set QWEN_IMAGE_EDIT_MODEL=Qwen/Qwen-Image-Edit-2511
uvicorn qwen_image_edit_worker:app --host 127.0.0.1 --port 8012
```

然后到 `/settings` 把 `Qwen 编辑 Worker 地址` 设为：

```text
http://127.0.0.1:8012
```

## 云端迁移

如果你准备把 `Qwen/Qwen-Image-Edit-2511` 放到云上跑，项目里已经补了：
- `Dockerfile`
- `workers/Dockerfile`
- `docker-compose.yml`
- `.env.deploy.example`

部署说明见：

```text
docs/cloud-deploy-qwen.md
```

快速启动脚本：

```text
deploy/ubuntu-bootstrap.sh
deploy/start-cloud.sh
```

新机操作手册：

```text
docs/new-server-runbook.md
```

## 当前架构说明

- 本地 `Ollama`：优先用于 OCR / 中文识别 / 翻译提示生成
- 本地 `Qwen-Image-Edit-2511`：用于真正的本地图像重绘编辑
- 通义万相 / OpenAI：作为远程图像编辑备选

## 当前限制

- `Qwen/Qwen-Image-Edit-2511` 的最终显存、速度和可运行性取决于你本机 GPU、CUDA、`torch`、`diffusers` 版本
- 本仓库已经接好了调用入口，但没有在当前环境里替你安装 Python 依赖或下载模型权重
