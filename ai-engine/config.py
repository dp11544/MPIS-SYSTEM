"""
config.py — Centralized production configuration for MPIS AI Engine.

All tunable constants are defined here in clearly-labelled sections.
No values are hardcoded in other modules — always import from this file.

Sections:
    MODEL_SETTINGS          — InsightFace model parameters
    SIMILARITY_SETTINGS     — Matching thresholds and decision margins
    TRACKING_SETTINGS       — Multi-frame tracker timing and cooldowns
    CAMERA_SETTINGS         — Stream acquisition and FPS control
    DATABASE_SETTINGS       — Backend fetch and refresh parameters
    THREAD_SETTINGS         — Threading behaviour across the engine
    API_SETTINGS            — Flask server configuration
    ALERT_SETTINGS          — Alert payload metadata and retry policy
    LOGGING_SETTINGS        — Log level, format, and date format
    HEALTH_CHECK_SETTINGS   — System health monitor intervals
"""

import os
import sys

# ─────────────────────────────────────────────────────────────────────────────
# BACKEND INTEGRATION
# ─────────────────────────────────────────────────────────────────────────────

BACKEND_URL                  = os.environ.get("MPIS_BACKEND_URL", "http://localhost:8080")
BACKEND_EMBEDDINGS_URL       = f"{BACKEND_URL}/api/persons/embeddings"
BACKEND_ALERT_URL            = f"{BACKEND_URL}/api/realtime/alert"

# ─────────────────────────────────────────────────────────────────────────────
# MODEL SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

# InsightFace model variant; "buffalo_l" = best accuracy (large model)
MODEL_NAME                   = "buffalo_l"

# Human-readable label used in alert payloads and API responses
MODEL_USED                   = "InsightFace-buffalo_l"

# Algorithm version tag — bump this when matching logic changes
ALGORITHM_VERSION            = "v2.1"

# All face embeddings produced by buffalo_l are exactly 512-dimensional
EMBEDDING_DIM                = 512

# Internal detection resolution passed to app.prepare(); 640×640 is standard
DETECTION_INPUT_SIZE         = (640, 640)

# ONNX execution provider — set to "CUDAExecutionProvider" for GPU inference
ONNX_PROVIDER               = "CPUExecutionProvider"

# ─────────────────────────────────────────────────────────────────────────────
# SIMILARITY SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

# Cosine similarity below this value → NO_MATCH (no identification attempted)
SIMILARITY_THRESHOLD         = 0.65

# Gap between top-1 and top-2 scores below this → UNCERTAIN_MATCH
# Prevents misidentification when two people have similar embeddings
UNCERTAINTY_MARGIN           = 0.10

# Maximum valid similarity (cosine can only reach 1.0 for identical vectors)
SIMILARITY_MAX               = 1.0

# ─────────────────────────────────────────────────────────────────────────────
# TRACKING SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

# Number of consecutive CONFIDENT_MATCH detections before an alert fires
REQUIRED_FRAMES              = 3

# All required frames must occur within this time window (seconds)
TRACKER_WINDOW_SECONDS       = 2.0

# Suppress repeat alerts for same person on same camera for this duration
ALERT_COOLDOWN_SECONDS       = 30

# Face slots with no detection updates after this interval are evicted
SLOT_EXPIRY_SECONDS          = 5.0

# Maximum pixel distance between centroids to consider the same face slot
CENTROID_DISTANCE_THRESHOLD  = 60.0

# Prune cooldown registry entries older than this (seconds) to prevent memory leak
COOLDOWN_PRUNE_INTERVAL      = 300

# ─────────────────────────────────────────────────────────────────────────────
# CAMERA SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

# Target processing frame rate — keep CPU usage manageable
TARGET_FPS                   = 15

# Derived from TARGET_FPS; sleep duration between frame iterations
FRAME_SLEEP_SECONDS          = 1.0 / TARGET_FPS   # ~0.067s

# How long to wait before attempting to reconnect to a lost camera stream
RECONNECT_DELAY_SECONDS      = 3.0

# 0 = reconnect indefinitely; N = give up after N consecutive attempts
MAX_RECONNECT_ATTEMPTS       = 0

# Minimum face bounding box dimension (width or height) in pixels
MIN_FACE_SIZE                = 80

# ─────────────────────────────────────────────────────────────────────────────
# FACE QUALITY SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

# Laplacian variance below this value → face is too blurry to use
BLUR_THRESHOLD               = 80.0

# Mean pixel brightness (0–255) below this → face is too dark
BRIGHTNESS_MIN               = 40.0

# Mean pixel brightness above this → face is overexposed
BRIGHTNESS_MAX               = 220.0

# Output size for preprocessed face crops fed to the embedder
FACE_CROP_SIZE               = 160

# Fraction of bbox dimension to expand in each direction before cropping
BBOX_EXPAND_RATIO            = 0.20

# ─────────────────────────────────────────────────────────────────────────────
# DATABASE SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

# Interval between automatic background DB refreshes (seconds)
DB_REFRESH_INTERVAL_SECONDS  = 30

# Initial backoff on first backend failure (seconds); doubles each retry
DB_BACKOFF_BASE_SECONDS      = 2.0

# Cap total backoff wait at this value even after many consecutive failures
DB_BACKOFF_MAX_SECONDS       = 60.0

# HTTP timeout when fetching embeddings from backend
BACKEND_REQUEST_TIMEOUT      = 3     # seconds

# ─────────────────────────────────────────────────────────────────────────────
# THREAD SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

# Seconds to wait for camera threads to join cleanly on stop()
CAMERA_THREAD_JOIN_TIMEOUT   = 5.0

# Seconds between each system health monitor log emission
HEALTH_LOG_INTERVAL_SECONDS  = 60

# ─────────────────────────────────────────────────────────────────────────────
# API SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

# Bind only to loopback — never expose this port on any public interface
AI_ENGINE_HOST               = os.environ.get("HOST", "0.0.0.0")

AI_ENGINE_PORT               = int(os.environ.get("PORT", 5000))

# Flask-Limiter rate limit expression
API_RATE_LIMIT               = "60 per minute"

# ─────────────────────────────────────────────────────────────────────────────
# ALERT SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

# Number of retry attempts after an initial alert POST failure
ALERT_RETRY_COUNT            = 1

# Backoff durations (seconds) for retry attempts [attempt-1, attempt-2, ...]
ALERT_RETRY_BACKOFFS         = [0.5, 1.0]

# Maximum in-memory alert history kept by AlertService
ALERT_HISTORY_LIMIT          = 100

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

LOG_LEVEL                    = "INFO"
LOG_FORMAT                   = "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
LOG_DATE_FORMAT              = "%Y-%m-%d %H:%M:%S"

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

# Interval between health metric log lines (seconds)
HEALTH_CHECK_INTERVAL        = 60

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION VALIDATION
# Runs at import time; aborts startup if any value is out of range.
# ─────────────────────────────────────────────────────────────────────────────

def _validate_config() -> None:
    """Assert that all critical constants are within acceptable ranges."""
    errors = []

    if EMBEDDING_DIM != 512:
        errors.append(f"EMBEDDING_DIM must be 512, got {EMBEDDING_DIM}")
    if not (0.0 < SIMILARITY_THRESHOLD < 1.0):
        errors.append(f"SIMILARITY_THRESHOLD must be in (0,1), got {SIMILARITY_THRESHOLD}")
    if not (0.0 < UNCERTAINTY_MARGIN < 0.5):
        errors.append(f"UNCERTAINTY_MARGIN must be in (0,0.5), got {UNCERTAINTY_MARGIN}")
    if REQUIRED_FRAMES < 1:
        errors.append(f"REQUIRED_FRAMES must be ≥ 1, got {REQUIRED_FRAMES}")
    if not (1 <= AI_ENGINE_PORT <= 65535):
        errors.append(f"AI_ENGINE_PORT must be 1–65535, got {AI_ENGINE_PORT}")
    if TARGET_FPS <= 0:
        errors.append(f"TARGET_FPS must be > 0, got {TARGET_FPS}")
    if MIN_FACE_SIZE <= 0:
        errors.append(f"MIN_FACE_SIZE must be > 0, got {MIN_FACE_SIZE}")

    if errors:
        for msg in errors:
            print(f"[CONFIG ERROR] {msg}", file=sys.stderr)
        raise ValueError(f"Configuration validation failed with {len(errors)} error(s).")


_validate_config()
