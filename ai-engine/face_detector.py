"""
face_detector.py — Production face detection filter for MPIS AI Engine.
"""

import logging
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np  # type: ignore

from config import MIN_FACE_SIZE, EMBEDDING_DIM  # type: ignore

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────
# Dataclass
# ──────────────────────────────────────────────────────────────

@dataclass
class DetectedFace:

    bbox: np.ndarray
    embedding: np.ndarray
    landmarks: Optional[np.ndarray]
    confidence: float
    width: int
    height: int
    area: int
    aspect_ratio: float
    is_frontal: bool
    camera_id: str = field(default="UNKNOWN")

    def __repr__(self) -> str:
        return (
            f"DetectedFace(camera='{self.camera_id}' "
            f"size={self.width}×{self.height} "
            f"area={self.area} "
            f"ar={self.aspect_ratio:.2f} "
            f"frontal={self.is_frontal} "
            f"conf={self.confidence:.3f})"
        )


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def validate_bbox(bbox: np.ndarray) -> bool:

    if bbox is None:
        return False

    if bbox.shape != (4,):
        return False

    x1, y1, x2, y2 = bbox

    if x1 < 0 or y1 < 0:
        return False

    if x2 <= x1 or y2 <= y1:
        return False

    return True


def compute_face_metrics(bbox: np.ndarray) -> dict:

    x1, y1, x2, y2 = bbox

    width = int(x2 - x1)
    height = int(y2 - y1)

    aspect_ratio = width / height if height > 0 else 0

    return {
        "width": width,
        "height": height,
        "area": width * height,
        "aspect_ratio": round(aspect_ratio, 3),
        "is_frontal": 0.7 <= aspect_ratio <= 1.5,
    }


def filter_invalid_faces(raw_faces: list) -> Tuple[list, int]:

    valid = []
    rejected = 0

    for face in raw_faces:

        bbox = getattr(face, "bbox", None)

        if bbox is None:
            rejected += 1
            continue

        bbox = np.asarray(bbox, dtype=int)

        if not validate_bbox(bbox):
            rejected += 1
            continue

        emb = getattr(face, "normed_embedding", None)

        if emb is None:
            rejected += 1
            continue

        valid.append(face)

    return valid, rejected


# ──────────────────────────────────────────────────────────────
# Detector
# ──────────────────────────────────────────────────────────────

class FaceDetector:

    def __init__(self, min_face_size: int = MIN_FACE_SIZE):

        self.min_face_size = min_face_size

        self._frames_processed = 0
        self._total_detected = 0

        self._total_rejected_bbox = 0
        self._total_rejected_size = 0
        self._total_rejected_emb = 0
        self._total_rejected_score = 0

        logger.info("[FACE DETECTOR] Initialised (min_face_size=%d)", min_face_size)

    # ----------------------------------------------------------

    def filter(self, raw_faces: list, camera_id: str = "UNKNOWN") -> List[DetectedFace]:

        self._frames_processed += 1

        detected: List[DetectedFace] = []

        pre_screened, rejected = filter_invalid_faces(raw_faces)

        self._total_rejected_bbox += rejected

        for face in pre_screened:

            try:

                bbox = np.asarray(face.bbox, dtype=int)

                metrics = compute_face_metrics(bbox)

                # Gate 1 — detection confidence
                det_score = float(getattr(face, "det_score", 1.0))

                if det_score < 0.50:
                    self._total_rejected_score += 1
                    continue

                # Gate 2 — minimum face size
                if metrics["width"] < self.min_face_size or metrics["height"] < self.min_face_size:

                    self._total_rejected_size += 1
                    continue

                # Gate 3 — aspect ratio sanity
                if metrics["aspect_ratio"] < 0.4 or metrics["aspect_ratio"] > 2.5:
                    continue

                # Gate 4 — embedding validation
                emb = face.normed_embedding

                if not isinstance(emb, np.ndarray):
                    self._total_rejected_emb += 1
                    continue

                if emb.shape != (EMBEDDING_DIM,):
                    self._total_rejected_emb += 1
                    continue

                if not np.all(np.isfinite(emb)):
                    self._total_rejected_emb += 1
                    continue

                norm = float(np.linalg.norm(emb))

                if norm < 0.5 or norm > 2.0:
                    self._total_rejected_emb += 1
                    continue

                norm = max(norm, 1e-8)

                embedding = (emb / norm).astype(np.float32)

                kps = getattr(face, "kps", None)

                df = DetectedFace(
                    bbox=bbox,
                    embedding=embedding,
                    landmarks=kps,
                    confidence=det_score,
                    width=metrics["width"],
                    height=metrics["height"],
                    area=metrics["area"],
                    aspect_ratio=metrics["aspect_ratio"],
                    is_frontal=metrics["is_frontal"],
                    camera_id=camera_id,
                )

                detected.append(df)

                self._total_detected += 1

                logger.info(
                    "[FACE DETECTED] cam=%s size=%dx%d conf=%.3f",
                    camera_id,
                    df.width,
                    df.height,
                    df.confidence,
                )

            except Exception as exc:

                logger.error(
                    "[FACE DETECTOR ERROR] cam=%s err=%s",
                    camera_id,
                    exc,
                )

        return detected

    # ----------------------------------------------------------

    def get_lifetime_stats(self):

        return {
            "frames_processed": self._frames_processed,
            "total_detected": self._total_detected,
            "rejected_bbox": self._total_rejected_bbox,
            "rejected_size": self._total_rejected_size,
            "rejected_embedding": self._total_rejected_emb,
            "rejected_score": self._total_rejected_score,
        }