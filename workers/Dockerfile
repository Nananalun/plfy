FROM pytorch/pytorch:2.6.0-cuda12.4-cudnn9-runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HF_HOME=/models/huggingface
ENV TRANSFORMERS_CACHE=/models/huggingface
ENV HUGGINGFACE_HUB_CACHE=/models/huggingface
ENV QWEN_IMAGE_EDIT_MODEL=Qwen/Qwen-Image-Edit-2511

COPY requirements-qwen-image-edit.txt ./
RUN pip install --no-cache-dir -r requirements-qwen-image-edit.txt

COPY qwen_image_edit_worker.py ./

EXPOSE 8012

CMD ["uvicorn", "qwen_image_edit_worker:app", "--host", "0.0.0.0", "--port", "8012"]
