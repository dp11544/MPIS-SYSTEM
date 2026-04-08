"""
config.py — Centralized production configuration for MPIS AI Engine.
"""

import os
import sys
# ─────────────────────────────────────────────────────────────────────────────
# BACKEND INTEGRATION
# ─────────────────────────────────────────────────────────────────────────────

BACKEND_URL = os.environ.get("MPIS_BACKEND_URL")

# 🔴 HARD FAIL if not set (no silent bugs)
if not BACKEND_URL:
    raise ValueError("❌ MPIS_BACKEND_URL is NOT set. Fix your environment variable.")

# 🔴 Warn if using localhost (almost always wrong in your case)
if "localhost" in BACKEND_URL or "127.0.0.1" in BACKEND_URL:
    print("⚠️ WARNING: Using localhost backend. This is likely incorrect.", file=sys.stderr)

BACKEND_EMBEDDINGS_URL = f"{BACKEND_URL}/api/persons/embeddings"
BACKEND_ALERT_URL      = f"{BACKEND_URL}/api/realtime/alert"

# ✅ DEBUG PRINTS (DO NOT REMOVE until system is stable)
print(f"[CONFIG] MPIS_BACKEND_URL = {os.environ.get('MPIS_BACKEND_URL')}")
print(f"[CONFIG] BACKEND_URL = {BACKEND_URL}")
print(f"[CONFIG] EMBEDDINGS_URL = {BACKEND_EMBEDDINGS_URL}")
print(f"[CONFIG] ALERT_URL = {BACKEND_ALERT_URL}")

# ─────────────────────────────────────────────────────────────────────────────
# MODEL SETTINGS (FIXED FOR RAILWAY)
# ─────────────────────────────────────────────────────────────────────────────

MODEL_NAME            = "buffalo_s"
MODEL_USED            = "InsightFace-buffalo_s"
ALGORITHM_VERSION     = "v2.1"

EMBEDDING_DIM         = 512
DETECTION_INPUT_SIZE  = (320, 320)
ONNX_PROVIDER         = "CPUExecutionProvider"

# ─────────────────────────────────────────────────────────────────────────────
# SIMILARITY SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

CONFIDENT_THRESHOLD   = float(os.environ.get("CONFIDENT_THRESHOLD", "0.70"))
REVIEW_THRESHOLD      = float(os.environ.get("REVIEW_THRESHOLD", "0.40"))
UNCERTAINTY_MARGIN    = float(os.environ.get("UNCERTAINTY_MARGIN", "0.05"))
SIMILARITY_MAX        = 1.0

# ─────────────────────────────────────────────────────────────────────────────
# TRACKING SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

REQUIRED_FRAMES              = 3
TRACKER_WINDOW_SECONDS       = 2.0
ALERT_COOLDOWN_SECONDS       = 30
SLOT_EXPIRY_SECONDS          = 5.0
CENTROID_DISTANCE_THRESHOLD  = 60.0
COOLDOWN_PRUNE_INTERVAL      = 300

# ─────────────────────────────────────────────────────────────────────────────
# CAMERA SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

TARGET_FPS              = 15
FRAME_SLEEP_SECONDS     = 1.0 / TARGET_FPS
RECONNECT_DELAY_SECONDS = 3.0
MAX_RECONNECT_ATTEMPTS  = 0
MIN_FACE_SIZE           = 80

# ─────────────────────────────────────────────────────────────────────────────
# FACE QUALITY SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

BLUR_THRESHOLD      = 80.0
BRIGHTNESS_MIN      = 40.0
BRIGHTNESS_MAX      = 220.0
FACE_CROP_SIZE      = 160
BBOX_EXPAND_RATIO   = 0.20

# ─────────────────────────────────────────────────────────────────────────────
# DATABASE SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

DB_REFRESH_INTERVAL_SECONDS = 30
DB_BACKOFF_BASE_SECONDS     = 2.0
DB_BACKOFF_MAX_SECONDS      = 60.0
BACKEND_REQUEST_TIMEOUT     = 10

# ─────────────────────────────────────────────────────────────────────────────
# THREAD SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

CAMERA_THREAD_JOIN_TIMEOUT  = 5.0
HEALTH_LOG_INTERVAL_SECONDS = 60

# ─────────────────────────────────────────────────────────────────────────────
# API SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

AI_ENGINE_HOST = os.environ.get("HOST", "0.0.0.0")
AI_ENGINE_PORT = int(os.environ.get("PORT", 5000))
API_RATE_LIMIT = "60 per minute"

# ─────────────────────────────────────────────────────────────────────────────
# ALERT SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

ALERT_RETRY_COUNT     = 1
ALERT_RETRY_BACKOFFS  = [0.5, 1.0]
ALERT_HISTORY_LIMIT   = 100

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

LOG_LEVEL       = "INFO"
LOG_FORMAT      = "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

HEALTH_CHECK_INTERVAL = 60

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

def _validate_config() -> None:
    errors = []

    if EMBEDDING_DIM != 512:
        errors.append(f"EMBEDDING_DIM must be 512, got {EMBEDDING_DIM}")
    if not (0.0 < REVIEW_THRESHOLD < CONFIDENT_THRESHOLD <= 1.0):
        errors.append(f"Thresholds must follow 0 < REVIEW < CONFIDENT <= 1")
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

