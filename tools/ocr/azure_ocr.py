# -*- coding: utf-8 -*-
"""Azure OpenAI based OCR helper used by ocr_extract.py.

Expected public API:
- RateLimiter(rps)
- AzureReadClient(...).ocr_image(PIL.Image, rate_limiter=...)
"""

from __future__ import annotations

import base64
import io
import os
import threading
import time
from typing import Any, Optional

try:
    from openai import AzureOpenAI
except Exception as e:  # pragma: no cover - import error path
    AzureOpenAI = None
    _IMPORT_ERROR = e
else:
    _IMPORT_ERROR = None

import config


class RateLimiter:
    def __init__(self, rps: float = 8.0):
        self.rps = max(0.0, float(rps))
        self._interval = (1.0 / self.rps) if self.rps > 0 else 0.0
        self._lock = threading.Lock()
        self._next_allowed = 0.0

    def wait(self) -> None:
        if self._interval <= 0:
            return
        with self._lock:
            now = time.monotonic()
            if now < self._next_allowed:
                time.sleep(self._next_allowed - now)
                now = time.monotonic()
            self._next_allowed = now + self._interval

    def acquire(self) -> None:
        self.wait()


class AzureReadClient:
    def __init__(
        self,
        azure_endpoint: Optional[str],
        api_key: Optional[str],
        *,
        api_version: str = "2024-02-01",
        poll_interval: float = 0.5,  # compatibility; not used by GPT flow
        timeout: float = 60.0,
        max_retries: int = 3,
    ):
        del poll_interval
        if AzureOpenAI is None:
            raise RuntimeError(
                f"`openai` 패키지를 불러오지 못했습니다: {_IMPORT_ERROR}. "
                "먼저 `pip install openai` 를 설치하세요."
            )

        endpoint = azure_endpoint or os.getenv("AZURE_OPENAI_ENDPOINT", "")
        key = api_key or os.getenv("AZURE_OPENAI_API_KEY", "")
        version = api_version or os.getenv("AZURE_API_VERSION", "")

        if not endpoint or not key or not version:
            raise ValueError(
                "Azure OpenAI 설정이 비어 있습니다. "
                "endpoint/key/api_version 또는 "
                "AZURE_OPENAI_ENDPOINT/AZURE_OPENAI_API_KEY/AZURE_API_VERSION 을 확인하세요."
            )

        self.model = getattr(config, "OPENAI_VISION_MODEL", "gpt-4.1-mini")
        self.client = AzureOpenAI(
            api_version=version,
            azure_endpoint=endpoint,
            api_key=key,
            timeout=timeout,
            max_retries=max_retries,
        )

    @staticmethod
    def _to_data_url(img: Any) -> str:
        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="JPEG", quality=90)
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return f"data:image/jpeg;base64,{b64}"

    def ocr_image(self, img: Any, rate_limiter: Optional[RateLimiter] = None) -> str:
        if rate_limiter is not None:
            if hasattr(rate_limiter, "wait"):
                rate_limiter.wait()
            elif hasattr(rate_limiter, "acquire"):
                rate_limiter.acquire()

        data_url = self._to_data_url(img)

        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": "You are an OCR engine. Return only the extracted text with no explanation.",
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract all visible text exactly from this image."},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                },
            ],
        )

        text = (response.choices[0].message.content or "").strip()
        return " ".join(text.split())
