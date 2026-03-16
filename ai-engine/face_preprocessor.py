"""
face_preprocessor.py — Advanced face quality checking and crop preparation.

Role in the pipeline:
  - CAMERA PATH:  InsightFace already handles aligned crops internally.
                  Preprocessing is NOT required for the main streaming loop.
  - API PATH:     When the backend uploads a raw photo, we manually crop the
                  face region, verify quality, and prepare it for embedding.

Quality gates (in order):
    1. Size check    — reject faces smaller than 80 × 80 px.
    2. Blur check    — Laplacian variance < BLUR_THRESHOLD → reject.
    3. Brightness    — mean pixel value outside [BRIGHTNESS_MIN, BRIGHTNESS_MAX] → reject.
    4. Crop          — expand bbox by BBOX_EXPAND_RATIO with boundary clamping.
    5. Resize        — to FACE_CROP_SIZE × FACE_CROP_SIZE.
    6. Normalize     — pixel values to float32 [0.0, 1.0].

Public API:
    preprocess_face(frame, x, y, w, h)   → np.ndarray | None
    crop_face(frame, x, y, w, h)         → np.ndarray | None
    check_blur(image)                    → float
    check_brightness(image)              → float
    normalize_face_image(image)          → np.ndarray
    assess_face_quality(image)           → FaceQualityReport
"""

import logging
from dataclasses import dataclass
from typing import Optional, Tuple

import cv2   # type: ignore
import numpy as np  # type: ignore

from config import (  # type: ignore
    BLUR_THRESHOLD,
    BRIGHTNESS_MIN,
    BRIGHTNESS_MAX,
    FACE_CROP_SIZE,
    BBOX_EXPAND_RATIO,
)

logger = logging.getLogger(__name__)

# Minimum bounding-box dimension accepted by preprocess_face
_MIN_PREPROCESS_SIZE = 80


# ─── FaceQualityReport ────────────────────────────────────────────────────────

@dataclass
class FaceQualityReport:
    """
    Composite result of assess_face_quality().

    Attributes:
        blur_score      : Laplacian variance (higher = sharper).
        brightness_mean : Mean pixel intensity (0–255).
        is_sharp        : True when blur_score >= BLUR_THRESHOLD.
        is_bright_enough: True when brightness_mean >= BRIGHTNESS_MIN.
        is_not_overexposed: True when brightness_mean <= BRIGHTNESS_MAX.
        passed          : True if all quality gates passed.
        reason          : Human-readable explanation of first failure, or 'OK'.
    """
    blur_score: float
    brightness_mean: float
    is_sharp: bool
    is_bright_enough: bool
    is_not_overexposed: bool
    passed: bool
    reason: str

    def __repr__(self) -> str:
        return (
            f"FaceQualityReport(passed={self.passed} blur={self.blur_score:.1f} "
            f"brightness={self.brightness_mean:.1f} reason='{self.reason}')"
        )


# ─── Standalone Helpers ────────────────────────────────────────────────────────

def check_blur(image: np.ndarray) -> float:
    """
    Measure image sharpness using Laplacian variance.

    A higher value = sharper image.  Below BLUR_THRESHOLD the face should be
    rejected as too blurry to produce reliable embeddings.

    Args:
        image: BGR or grayscale uint8 np.ndarray.

    Returns:
        Laplacian variance as a float; returns 0.0 on invalid input.
    """
    if image is None or image.size == 0:
        return 0.0
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        return variance
    except Exception as exc:
        logger.debug("[PREPROCESSOR] check_blur() error: %s", exc)
        return 0.0


def check_brightness(image: np.ndarray) -> float:
    """
    Compute mean pixel brightness of a BGR (or grayscale) face image.

    Too-dark faces (< BRIGHTNESS_MIN) and overexposed faces (> BRIGHTNESS_MAX)
    lack the pixel detail needed for accurate embedding extraction.

    Args:
        image: BGR or grayscale uint8 np.ndarray.

    Returns:
        Mean pixel intensity in [0, 255]; returns 0.0 on invalid input.
    """
    if image is None or image.size == 0:
        return 0.0
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        return float(np.mean(gray))
    except Exception as exc:
        logger.debug("[PREPROCESSOR] check_brightness() error: %s", exc)
        return 0.0


def crop_face(
    frame: np.ndarray,
    x: int,
    y: int,
    w: int,
    h: int,
    expand_ratio: float = BBOX_EXPAND_RATIO,
) -> Optional[np.ndarray]:
    """
    Crop a face region from a BGR frame with a safety margin.

    Expands the bounding box by `expand_ratio` in each direction, then clamps
    to the frame boundaries to avoid out-of-bounds access.

    Args:
        frame        : Full BGR frame (H × W × 3 uint8).
        x, y, w, h  : Bounding box in top-left origin, width × height format.
        expand_ratio : Fractional expansion in each direction (default 20%).

    Returns:
        Cropped BGR face image, or None if the crop would be empty.
    """
    if frame is None or frame.size == 0:
        return None

    frame_h, frame_w = frame.shape[:2]
    margin_x = int(w * expand_ratio)
    margin_y = int(h * expand_ratio)

    x1 = max(0, x - margin_x)
    y1 = max(0, y - margin_y)
    x2 = min(frame_w, x + w + margin_x)
    y2 = min(frame_h, y + h + margin_y)

    if x2 <= x1 or y2 <= y1:
        logger.debug(
            "[PREPROCESSOR] crop_face() produced empty region: x1=%d y1=%d x2=%d y2=%d",
            x1, y1, x2, y2,
        )
        return None

    crop = frame[y1:y2, x1:x2]
    return crop if crop.size > 0 else None


def normalize_face_image(image: np.ndarray) -> np.ndarray:
    """
    Convert a uint8 BGR face image to a normalized float32 image.

    Normalization: pixel / 255.0 → all values in [0.0, 1.0].
    Output shape is identical to input.

    Args:
        image: uint8 BGR or RGB np.ndarray.

    Returns:
        float32 np.ndarray with values in [0.0, 1.0].
    """
    return (image.astype(np.float32) / 255.0)


def assess_face_quality(image: np.ndarray) -> FaceQualityReport:
    """
    Run all quality checks on a cropped face image and return a report.

    This is the composite entry point for quality assessment.  It does NOT
    resize the image.  Call it on the raw crop before resizing.

    Args:
        image: BGR uint8 cropped face image.

    Returns:
        FaceQualityReport describing which gates passed and why (if any failed).
    """
    blur   = check_blur(image)
    bright = check_brightness(image)

    is_sharp    = blur   >= BLUR_THRESHOLD
    is_bright   = bright >= BRIGHTNESS_MIN
    not_exposed = bright <= BRIGHTNESS_MAX

    passed = is_sharp and is_bright and not_exposed
    if not is_sharp:
        reason = f"Too blurry (laplacian={blur:.1f} < threshold={BLUR_THRESHOLD})"
    elif not is_bright:
        reason = f"Too dark (mean={bright:.1f} < min={BRIGHTNESS_MIN})"
    elif not not_exposed:
        reason = f"Overexposed (mean={bright:.1f} > max={BRIGHTNESS_MAX})"
    else:
        reason = "OK"

    return FaceQualityReport(
        blur_score=round(blur, 2),
        brightness_mean=round(bright, 2),
        is_sharp=is_sharp,
        is_bright_enough=is_bright,
        is_not_overexposed=not_exposed,
        passed=passed,
        reason=reason,
    )


# ─── Main Pipeline Entry ────────────────────────────────────────────────────────

def preprocess_face(
    frame: np.ndarray,
    x: int,
    y: int,
    w: int,
    h: int,
    target_size: int = FACE_CROP_SIZE,
    expand_ratio: float = BBOX_EXPAND_RATIO,
) -> Optional[np.ndarray]:
    """
    Full preprocessing pipeline for a face region.

    Steps:
        1. Reject faces < 80×80 px.
        2. Crop with expansion + boundary clamping.
        3. Assess quality (blur + brightness).
        4. Resize to target_size × target_size.
        5. Convert BGR → RGB.

    Args:
        frame        : Full BGR camera frame.
        x, y, w, h  : Bounding box (top-left, width, height).
        target_size  : Final output side length (default FACE_CROP_SIZE = 160).
        expand_ratio : Bbox expansion factor (default BBOX_EXPAND_RATIO = 0.20).

    Returns:
        RGB uint8 np.ndarray of shape (target_size, target_size, 3), or None.
    """
    if frame is None or frame.size == 0:
        logger.debug("[PREPROCESSOR] preprocess_face() received empty frame")
        return None

    # ── Gate 1: minimum face size ─────────────────────────────────────────
    if w < _MIN_PREPROCESS_SIZE or h < _MIN_PREPROCESS_SIZE:
        logger.debug(
            "[PREPROCESSOR] Rejected small face %dx%d (min=%d)",
            w, h, _MIN_PREPROCESS_SIZE,
        )
        return None

    # ── Gate 2: crop ──────────────────────────────────────────────────────
    face = crop_face(frame, x, y, w, h, expand_ratio=expand_ratio)
    if face is None:
        logger.warning("[PREPROCESSOR] crop_face() returned None — skipping face")
        return None

    # ── Gate 3: quality assessment ────────────────────────────────────────
    quality = assess_face_quality(face)
    if not quality.passed:
        logger.debug("[PREPROCESSOR] Quality check failed: %s", quality.reason)
        return None

    # ── Resize and colour convert ─────────────────────────────────────────
    try:
        face_resized = cv2.resize(face, (target_size, target_size), interpolation=cv2.INTER_LINEAR)
        face_rgb     = cv2.cvtColor(face_resized, cv2.COLOR_BGR2RGB)
    except Exception as exc:
        logger.error("[PREPROCESSOR] Resize/convert error: %s", exc)
        return None

    logger.debug(
        "[PREPROCESSOR] preprocess_face() OK  blur=%.1f brightness=%.1f → (%d,%d,3)",
        quality.blur_score, quality.brightness_mean, target_size, target_size,
    )
    return face_rgb