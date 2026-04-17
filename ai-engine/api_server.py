"""
api_server.py — CLEAN PRODUCTION VERSION (USE THIS)
"""

import logging
import time

import cv2
import numpy as np
from flask import request, jsonify

try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    LIMITER_AVAILABLE = True
except ImportError:
    LIMITER_AVAILABLE = False

try:
    from flask_cors import CORS as FlaskCORS
    CORS_AVAILABLE = True
except ImportError:
    CORS_AVAILABLE = False

from config import (
    API_RATE_LIMIT,
    EMBEDDING_DIM,
    MODEL_NAME,
    ALGORITHM_VERSION,
    MODEL_USED,
)

logger = logging.getLogger(__name__)

_engine_getter = None
_db_loader_getter = None
_matcher_getter = None
_start_time = time.time()


# ---------------------------------------------------------
def register_routes(app, engine, db_loader, matcher):

    global _engine_getter, _db_loader_getter, _matcher_getter, _start_time

    _engine_getter = engine
    _db_loader_getter = db_loader
    _matcher_getter = matcher
    _start_time = time.time()

    app.config["JSON_SORT_KEYS"] = False

    # ---------------- CORS ----------------
    if CORS_AVAILABLE:
        FlaskCORS(app, origins="*")

    # ---------------- Rate Limiter ----------------
    if LIMITER_AVAILABLE:
        limiter = Limiter(
            key_func=get_remote_address,
            default_limits=[API_RATE_LIMIT],
            storage_uri="memory://",
        )
        limiter.init_app(app)
    else:
        class _NoLimiter:
            def limit(self, *args, **kwargs):
                def decorator(f):
                    return f
                return decorator
        limiter = _NoLimiter()

    # ---------------------------------------------------------
    # HEALTH
    # ---------------------------------------------------------
    @app.route("/health", methods=["GET"])
    def health():

        uptime_seconds = int(time.time() - _start_time)

        db_size = 0
        try:
            db = _db_loader_getter()
            db_size = len(db.get_snapshot())
        except Exception:
            pass

        return jsonify({
            "status": "ok",
            "model": MODEL_NAME,
            "embeddingDim": EMBEDDING_DIM,
            "uptimeSeconds": uptime_seconds,
            "personsInDB": db_size,
        }), 200

    # ---------------------------------------------------------
    # 🔥 MAIN MATCH ENDPOINT (ONLY ONE YOU NEED)
    # ---------------------------------------------------------
    @app.route("/match", methods=["POST"])
    @limiter.limit(API_RATE_LIMIT)
    def match():

        # Accept both "file" and "image"
        file = request.files.get("file") or request.files.get("image")

        if not file:
            return _error("No file provided", 400)

        # Decode image
        try:
            image_bytes = file.read()
            arr = np.frombuffer(image_bytes, dtype=np.uint8)
            image = cv2.imdecode(arr, cv2.IMREAD_COLOR)

            if image is None:
                return _error("Invalid image format", 400)

        except Exception as exc:
            logger.error("[API] decode error: %s", exc)
            return _error("Image decode failed", 400)

        # Load components
        try:
            engine = _engine_getter()
            db_loader = _db_loader_getter()
            matcher = _matcher_getter()
        except Exception as e:
            logger.error("[API] init failed: %s", e)
            return _error("Engine initialization failed", 500)

        # Extract ALL faces dynamically (Crowd capability)
        valid_faces = engine.get_faces(image)

        if not valid_faces:
            return jsonify({
                "status": "NO_FACE",
                "similarity": 0.0,
                "allScores": {}
            }), 200

        # Perform matching across the entire crowd frame
        try:
            database = db_loader.get_snapshot()
            
            best_result = None
            for face in valid_faces:
                emb = getattr(face, "normed_embedding", None)
                normalized = engine.normalize_embedding(emb)
                
                if normalized is not None:
                    res = matcher.match(normalized, database)
                    
                    # Store the highest matching identity in the frame
                    if best_result is None or res.similarity > best_result.similarity:
                         best_result = res
                         
            # No valid embeddings resolved
            if best_result is None:
                return jsonify({
                    "status": "ERROR",
                    "message": "Valid faces found but embedding degradation failed validation layer"
                }), 400
                
            result = best_result
            
        except Exception as exc:
            logger.error("[API] match error: %s", exc)
            return _error("Matching failed", 500)

        response = {
            "status": result.status,
            "similarity": result.similarity,
            "allScores": result.all_scores,
        }

        if result.status in ["CONFIDENT_MATCH", "REVIEW_MATCH"]:
            response["personId"] = result.person_id
            response["personName"] = result.person_name

        return jsonify(response), 200

    # ---------------------------------------------------------
    # 🔥 EXTRACT ENDPOINT (FOR MULTI-PHOTO REGISTRATION)
    # ---------------------------------------------------------
    @app.route("/extract", methods=["POST"])
    @limiter.limit(API_RATE_LIMIT)
    def extract():
        file = request.files.get("file") or request.files.get("image")
        if not file:
            return _error("No file provided", 400)

        try:
            image_bytes = file.read()
            arr = np.frombuffer(image_bytes, dtype=np.uint8)
            image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if image is None:
                return _error("Invalid image format", 400)
        except Exception as exc:
            logger.error("[API] decode error: %s", exc)
            return _error("Image decode failed", 400)

        try:
            engine = _engine_getter()
            emb = engine.get_embedding_from_image(image)
        except Exception as e:
            logger.error("[API] extraction failed: %s", e)
            return _error("Engine extraction failed", 500)

        if emb is None:
            return jsonify({"status": "NO_FACE", "embedding": []}), 200

        return jsonify({"status": "SUCCESS", "embedding": emb.tolist()}), 200

    # ---------------------------------------------------------
    # ERROR HANDLER
    # ---------------------------------------------------------
    @app.errorhandler(500)
    def internal_error(e):
        logger.error("[API] internal error: %s", e)
        return _error("Internal server error", 500)


# ---------------------------------------------------------
def _error(message: str, code: int):
    return jsonify({
        "status": "ERROR",
        "message": message
    }), code