#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f .env ]]; then
  cp .env.deploy.example .env
  echo "已创建 .env，请先按需修改其中的密钥和模型配置。"
  exit 0
fi

docker compose up -d --build
docker compose ps

echo
echo "服务已启动。"
echo "前端默认地址：http://<server-ip>:3001"
echo "Ollama API：http://<server-ip>:11434"
echo "Ollama 模型列表：http://<server-ip>:11434/api/tags"
echo "Qwen worker 健康检查：http://<server-ip>:8012/health"
echo
echo "如需查看 Ollama 自动拉模型日志：docker compose logs -f ollama-pull"
