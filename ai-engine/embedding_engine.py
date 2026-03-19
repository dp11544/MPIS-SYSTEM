"""
embedding_engine.py — Production-grade InsightFace embedding engine for MPIS.
(STABLE VERSION FOR RAILWAY)
"""

import logging
import threading
import time
from typing import List, Optional

import numpy as np  # type: ignore
import onnxruntime as ort  # type: ignore
from insightface.app import FaceAnalysis  # type: ignore

from config import (
    MODEL_NAME,
    EMBEDDING_DIM,
    DETECTION_INPUT_SIZE,
    ONNX_PROVIDER,
    MODEL_USED,
    ALGORITHM_VERSION,
)

logger = logging.getLogger(__name__)

_engine_instance: Optional["EmbeddingEngine"] = None
_engine_lock = threading.Lock()


# ---------------- Singleton ----------------
def get_engine() -> "EmbeddingEngine":
    global _engine_instance

    if _engine_instance is None:
        with _engine_lock:
            if _engine_instance is None:
                logger.info("[EMBEDDING ENGINE] Creating singleton instance")
                _engine_instance = EmbeddingEngine()

    return _engine_instance


# ---------------- Engine ----------------
class EmbeddingEngine:

    def __init__(self) -> None:

        self._model_name = MODEL_NAME
        self._embedding_dim = EMBEDDING_DIM
        self._load_time: Optional[float] = None

        self._inference_count = 0
        self._total_inference_ms = 0.0

        provider = self._resolve_provider()

        logger.info(
            "[EMBEDDING ENGINE] Loading model=%s provider=%s",
            MODEL_NAME,
            provider,
        )

        start = time.monotonic()

        try:
            self.app = FaceAnalysis(
                name=MODEL_NAME,
                providers=[provider],
            )

            self.app.prepare(
                ctx_id=0,
                det_size=DETECTION_INPUT_SIZE,
            )

        except Exception as exc:
            logger.critical("[EMBEDDING ENGINE] Model load FAILED: %s", exc)
            raise RuntimeError("Failed to initialize InsightFace model") from exc

        self._load_time = time.monotonic() - start

        logger.info(
            "[EMBEDDING ENGINE] Model ready in %.2fs (dim=%d)",
            self._load_time,
            EMBEDDING_DIM,
        )

        # ❌ REMOVED warm_up() (IMPORTANT FIX)
        # self.warm_up()

    # -------------------------------------------------------

    def _resolve_provider(self) -> str:

        available = ort.get_available_providers()

        if ONNX_PROVIDER in available:
            return ONNX_PROVIDER

        if "CUDAExecutionProvider" in available:
            return "CUDAExecutionProvider"

        return "CPUExecutionProvider"

    # -------------------------------------------------------

    def get_faces(self, bgr_frame: np.ndarray) -> List:

        if bgr_frame is None or bgr_frame.size == 0:
            return []

        start = time.monotonic()

        try:
            faces = self.app.get(bgr_frame)
        except Exception as exc:
            logger.error("[EMBEDDING ENGINE] Inference error: %s", exc)
            return []

        elapsed = (time.monotonic() - start) * 1000
        self._record_inference(elapsed)

        valid_faces = []

        for face in faces:
            emb = getattr(face, "normed_embedding", None)
            if self.validate_embedding(emb):
                valid_faces.append(face)

        return valid_faces

    # -------------------------------------------------------

    def get_embedding_from_image(self, bgr_image: np.ndarray) -> Optional[np.ndarray]:

        if bgr_image is None or bgr_image.size == 0:
            return None

        start = time.monotonic()

        try:
            faces = self.app.get(bgr_image)
        except Exception as exc:
            logger.error("[EMBEDDING ENGINE] Inference error: %s", exc)
            return None

        elapsed = (time.monotonic() - start) * 1000
        self._record_inference(elapsed)

        if not faces:
            return None

        best = max(faces, key=lambda f: float(getattr(f, "det_score", 0)))

        emb = getattr(best, "normed_embedding", None)
        return self.normalize_embedding(emb)

    # -------------------------------------------------------

    @staticmethod
    def validate_embedding(emb: Optional[np.ndarray]) -> bool:

        if emb is None or not isinstance(emb, np.ndarray):
            return False

        if emb.shape != (EMBEDDING_DIM,):
            return False

        return float(np.linalg.norm(emb)) > 1e-6

    # -------------------------------------------------------

    @staticmethod
    def normalize_embedding(emb: Optional[np.ndarray]) -> Optional[np.ndarray]:

        if not EmbeddingEngine.validate_embedding(emb):
            return None

        norm = float(np.linalg.norm(emb))
        return (emb / norm).astype(np.float32)

    # -------------------------------------------------------

    def _record_inference(self, elapsed_ms: float) -> None:

        self._inference_count += 1
        self._total_inference_ms += elapsed_ms

    # -------------------------------------------------------

    def get_metrics(self) -> dict:

        avg = (
            self._total_inference_ms / self._inference_count
            if self._inference_count > 0
            else 0.0
        )

        return {
            "model_name": self._model_name,
            "model_used": MODEL_USED,
            "algorithm_version": ALGORITHM_VERSION,
            "embedding_dim": self._embedding_dim,
            "load_time_s": round(self._load_time or 0.0, 3),
            "inference_count": self._inference_count,
            "avg_inference_ms": round(avg, 2),
            "onnx_provider": ONNX_PROVIDER,
        }