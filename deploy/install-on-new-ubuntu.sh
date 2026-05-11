#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "请用 root 运行这个脚本。"
  echo "示例：sudo bash install-on-new-ubuntu.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

REPO_URL="${REPO_URL:-https://github.com/Nananalun/plfy.git}"
INSTALL_DIR="${INSTALL_DIR:-/srv/frameflow}"
APP_PORT="${APP_PORT:-3001}"
OLLAMA_PORT="${OLLAMA_PORT:-11434}"
OLLAMA_VISION_MODEL="${OLLAMA_VISION_MODEL:-qwen2.5vl:7b}"
QWEN_WORKER_PORT="${QWEN_WORKER_PORT:-8012}"
QWEN_IMAGE_EDIT_MODEL="${QWEN_IMAGE_EDIT_MODEL:-Qwen/Qwen-Image-Edit-2511}"
QWEN_PRELOAD_MODEL="${QWEN_PRELOAD_MODEL:-1}"
QWEN_REQUEST_TIMEOUT_SECONDS="${QWEN_REQUEST_TIMEOUT_SECONDS:-900}"
QWEN_MAX_CONCURRENT_REQUESTS="${QWEN_MAX_CONCURRENT_REQUESTS:-1}"
HF_TOKEN="${HF_TOKEN:-}"
OPENAI_API_KEY="${OPENAI_API_KEY:-}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
DASHSCOPE_API_KEY="${DASHSCOPE_API_KEY:-}"

apt-get update
apt-get install -y git

if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "没检测到 nvidia-smi。"
  echo "这台机器必须先装好 NVIDIA 驱动，再运行本脚本。"
  exit 1
fi

if [[ ! -d "${INSTALL_DIR}/.git" ]]; then
  mkdir -p "$(dirname "${INSTALL_DIR}")"
  git clone "${REPO_URL}" "${INSTALL_DIR}"
else
  git -C "${INSTALL_DIR}" pull --ff-only
fi

bash "${INSTALL_DIR}/deploy/ubuntu-bootstrap.sh"

cat > "${INSTALL_DIR}/.env" <<EOF
APP_PORT=${APP_PORT}
QWEN_WORKER_PORT=${QWEN_WORKER_PORT}

# Optional remote providers
OPENAI_API_KEY=${OPENAI_API_KEY}
GEMINI_API_KEY=${GEMINI_API_KEY}
DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}

# Local OCR / vision
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_PORT=${OLLAMA_PORT}
OLLAMA_VISION_MODEL=${OLLAMA_VISION_MODEL}

# Local Qwen image edit worker
QWEN_IMAGE_WORKER_URL=http://qwen-worker:8012
QWEN_IMAGE_EDIT_MODEL=${QWEN_IMAGE_EDIT_MODEL}
QWEN_PRELOAD_MODEL=${QWEN_PRELOAD_MODEL}
QWEN_REQUEST_TIMEOUT_SECONDS=${QWEN_REQUEST_TIMEOUT_SECONDS}
QWEN_MAX_CONCURRENT_REQUESTS=${QWEN_MAX_CONCURRENT_REQUESTS}

# Optional if the model repo requires auth
HF_TOKEN=${HF_TOKEN}
EOF

cd "${INSTALL_DIR}"
bash deploy/start-cloud.sh

SERVER_IP="$(hostname -I | awk '{print $1}')"

echo
echo "安装完成。"
echo "前端地址：http://${SERVER_IP}:${APP_PORT}"
echo "Ollama API：http://${SERVER_IP}:${OLLAMA_PORT}"
echo "Qwen health：http://${SERVER_IP}:${QWEN_WORKER_PORT}/health"
echo
echo "首次启动会较慢，因为要下载模型。"
echo "如果想看进度："
echo "docker compose -f ${INSTALL_DIR}/docker-compose.yml logs -f ollama-pull"
echo "docker compose -f ${INSTALL_DIR}/docker-compose.yml logs -f qwen-worker"
