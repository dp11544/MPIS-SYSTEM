"""
api_server.py — Internal AI Engine REST API (Railway-ready)
"""

import logging
import time

import cv2  # type: ignore
import numpy as np  # type: ignore
from flask import request, jsonify, Response  # type: ignore

try:
    from flask_limiter import Limiter  # type: ignore
    from flask_limiter.util import get_remote_address  # type: ignore
    LIMITER_AVAILABLE = True
except ImportError:
    LIMITER_AVAILABLE = False

try:
    from flask_cors import CORS as FlaskCORS  # type: ignore
    CORS_AVAILABLE = True
except ImportError:
    CORS_AVAILABLE = False

from config import (  # type: ignore
    API_RATE_LIMIT,
    EMBEDDING_DIM,
    MODEL_NAME,
    ALGORITHM_VERSION,
    MODEL_USED,
)

logger = logging.getLogger(__name__)

_engine = None
_db_loader = None
_matcher = None
_cam_manager = None
_start_time = time.time()


# ---------------------------------------------------------
# ROUTE REGISTRATION
# ---------------------------------------------------------

def register_routes(app, engine, db_loader, matcher, cam_manager=None):

    global _engine, _db_loader, _matcher, _cam_manager, _start_time

    _engine = engine
    _db_loader = db_loader
    _matcher = matcher
    _cam_manager = cam_manager
    _start_time = time.time()

    app.config["JSON_SORT_KEYS"] = False

    # ---------------- CORS ----------------
    if CORS_AVAILABLE:
        FlaskCORS(app, origins="*")
    else:
        logger.warning("[API SERVER] flask-cors not installed")

    # ---------------- Rate Limiter ----------------
    if LIMITER_AVAILABLE:
        limiter = Limiter(
            key_func=get_remote_address,
            default_limits=[API_RATE_LIMIT],
            storage_uri="memory://",  # ✅ explicit (fix warning)
        )
        limiter.init_app(app)
    else:
        class _NoLimiter:
            def limit(self, *args, **kwargs):
                def decorator(f):
                    return f
                return decorator
        limiter = _NoLimiter()
        logger.warning("[API SERVER] flask-limiter not installed")

    # ---------------------------------------------------------
    # HEALTH
    # ---------------------------------------------------------
    @app.route("/health", methods=["GET"])
    def health():

        uptime_seconds = int(time.time() - _start_time)

        db_size = 0
        if _db_loader is not None:
            try:
                db_size = len(_db_loader.get_snapshot())
            except Exception:
                db_size = 0

        return jsonify({
            "status": "ok",
            "model": MODEL_NAME,
            "algorithmVersion": ALGORITHM_VERSION,
            "modelUsed": MODEL_USED,
            "embeddingDim": EMBEDDING_DIM,
            "uptimeSeconds": uptime_seconds,
            "personsInDB": db_size,
        }), 200

    # ---------------------------------------------------------
    # VIDEO FEED (optional)
    # ---------------------------------------------------------
    @app.route("/video_feed")
    def video_feed():
        def generate_frames():
            while True:
                try:
                    if _cam_manager is not None:
                        frame = _cam_manager.get_latest_frame()
                        if frame is not None:
                            ret, buffer = cv2.imencode('.jpg', frame)
                            if ret:
                                frame_bytes = buffer.tobytes()
                                yield (b'--frame\r\n'
                                       b'Content-Type: image/jpeg\r\n\r\n' +
                                       frame_bytes + b'\r\n')
                    time.sleep(0.1)
                except Exception as e:
                    logger.error("[VIDEO FEED ERROR]: %s", e)
                    time.sleep(0.5)

        return Response(generate_frames(),
                        mimetype='multipart/x-mixed-replace; boundary=frame')

    # ---------------------------------------------------------
    # EXTRACT EMBEDDING
    # ---------------------------------------------------------
    @app.route("/extract-embedding", methods=["POST"])
    @limiter.limit(API_RATE_LIMIT)
    def extract_embedding():

        if _engine is None:
            return _error("AI engine not initialized", 503)

        if "image" not in request.files:
            return _error("No image file provided", 400)

        file = request.files["image"]

        if not file or file.filename == "":
            return _error("Empty image upload", 400)

        try:
            image_bytes = file.read()
            arr = np.frombuffer(image_bytes, dtype=np.uint8)
            image = cv2.imdecode(arr, cv2.IMREAD_COLOR)

            if image is None:
                return _error("Invalid image format", 400)

        except Exception as exc:
            logger.error("[API] image decode error: %s", exc)
            return _error("Image decode failed", 400)

        try:
            embedding = _engine.get_embedding_from_image(image)
        except Exception as e:
            logger.error("[API] embedding error: %s", e)
            return _error("Embedding extraction failed", 500)

        if embedding is None:
            return _error("No face detected", 400)

        return jsonify({
            "embedding": embedding.tolist(),
            "dimension": EMBEDDING_DIM,
            "model": MODEL_NAME,
        }), 200

    # ---------------------------------------------------------
    # RECOGNIZE FACE
    # ---------------------------------------------------------
    @app.route("/recognize-face", methods=["POST"])
    @limiter.limit(API_RATE_LIMIT)
    def recognize_face():

        if _matcher is None or _db_loader is None:
            return _error("AI engine not initialized", 503)

        body = request.get_json(silent=True)

        if not body or "embedding" not in body:
            return _error("JSON must contain 'embedding'", 400)

        raw_emb = body["embedding"]

        if not isinstance(raw_emb, list) or len(raw_emb) != EMBEDDING_DIM:
            return _error(f"Embedding must be {EMBEDDING_DIM} floats", 400)

        try:
            embedding = np.array(raw_emb, dtype=np.float32)
            norm = np.linalg.norm(embedding)

            if norm == 0:
                return _error("Invalid embedding (zero vector)", 400)

            embedding = embedding / norm

        except Exception as exc:
            return _error(f"Invalid embedding: {exc}", 400)

        try:
            database = _db_loader.get_snapshot()
            result = _matcher.match(embedding, database)
        except Exception as exc:
            logger.error("[API] recognition error: %s", exc)
            return _error("Recognition failed", 500)

        response = {
            "status": result.status,
            "similarity": result.similarity,
            "allScores": result.all_scores,
        }

        if result.is_confident:
            response["personId"] = result.person_id
            response["personName"] = result.person_name

        return jsonify(response), 200

    # ---------------------------------------------------------
    # ERROR HANDLERS
    # ---------------------------------------------------------
    @app.errorhandler(404)
    def not_found(e):
        return _error("Endpoint not found", 404)

    @app.errorhandler(405)
    def method_not_allowed(e):
        return _error("Method not allowed", 405)

    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return _error("Rate limit exceeded", 429)

    @app.errorhandler(500)
    def internal_error(e):
        logger.error("[API] internal error: %s", e)
        return _error("Internal server error", 500)


# ---------------------------------------------------------
# HELPERS
# ---------------------------------------------------------

def _error(message: str, code: int):
    return jsonify({
        "error": message,
        "status": code
    }), code