import base64
import io
import os
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from contextlib import nullcontext
from typing import Optional

import torch
from diffusers import QwenImageEditPlusPipeline
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel


DEFAULT_MODEL = os.getenv("QWEN_IMAGE_EDIT_MODEL", "Qwen/Qwen-Image-Edit-2511")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.bfloat16 if DEVICE == "cuda" else torch.float32
PRELOAD_MODEL = os.getenv("QWEN_PRELOAD_MODEL", "1") == "1"
REQUEST_TIMEOUT_SECONDS = int(os.getenv("QWEN_REQUEST_TIMEOUT_SECONDS", "900"))
MAX_CONCURRENT_REQUESTS = int(os.getenv("QWEN_MAX_CONCURRENT_REQUESTS", "1"))

app = FastAPI(title="Qwen Image Edit Worker")
pipeline = None
loaded_model_name = None
pipeline_lock = threading.Lock()
request_gate = threading.BoundedSemaphore(value=MAX_CONCURRENT_REQUESTS)
executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_REQUESTS)


class EditRequest(BaseModel):
    model: str = DEFAULT_MODEL
    prompt: str
    image_base64: str
    filename: Optional[str] = None


def ensure_pipeline(model_name: str):
    global pipeline, loaded_model_name

    with pipeline_lock:
        if loaded_model_name == model_name and pipeline is not None:
            return pipeline

        current = QwenImageEditPlusPipeline.from_pretrained(
            model_name,
            torch_dtype=DTYPE,
        )

        if DEVICE == "cuda":
            current = current.to("cuda")
        else:
            current = current.to("cpu")

        pipeline = current
        loaded_model_name = model_name
        return pipeline


def run_generation(model_name: str, prompt: str, image_bytes: bytes):
    current_pipeline = ensure_pipeline(model_name)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    inference_context = torch.inference_mode if hasattr(torch, "inference_mode") else nullcontext
    autocast_context = (
        torch.autocast(device_type="cuda", dtype=torch.bfloat16)
        if DEVICE == "cuda"
        else nullcontext()
    )

    with inference_context():
        with autocast_context:
            result = current_pipeline(
                image=image,
                prompt=prompt,
            )

    edited_image = result.images[0]
    buffer = io.BytesIO()
    edited_image.save(buffer, format="PNG")

    return {
        "image_base64": base64.b64encode(buffer.getvalue()).decode("utf-8"),
        "width": edited_image.width,
        "height": edited_image.height,
        "format": "png",
    }


@app.on_event("startup")
def preload_default_model():
    if PRELOAD_MODEL:
        ensure_pipeline(DEFAULT_MODEL)


@app.get("/health")
def health():
    return {
        "ok": True,
        "device": DEVICE,
        "default_model": DEFAULT_MODEL,
        "loaded_model": loaded_model_name or "",
        "preload_enabled": PRELOAD_MODEL,
        "max_concurrent_requests": MAX_CONCURRENT_REQUESTS,
        "request_timeout_seconds": REQUEST_TIMEOUT_SECONDS,
    }


@app.post("/edit")
def edit_image(payload: EditRequest):
    acquired = request_gate.acquire(blocking=False)
    if not acquired:
        raise HTTPException(status_code=429, detail="Qwen worker is busy. Try again later.")

    try:
        input_bytes = base64.b64decode(payload.image_base64)
        future = executor.submit(run_generation, payload.model, payload.prompt, input_bytes)

        try:
            return future.result(timeout=REQUEST_TIMEOUT_SECONDS)
        except FutureTimeoutError as exc:
            future.cancel()
            raise HTTPException(
                status_code=504,
                detail=f"Qwen worker timed out after {REQUEST_TIMEOUT_SECONDS} seconds.",
            ) from exc
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Qwen worker execution failed: {exc}") from exc
    finally:
        request_gate.release()
