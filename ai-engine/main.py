import logging
import os
import sys

from flask import Flask

from config import LOG_FORMAT, LOG_DATE_FORMAT, LOG_LEVEL
from embedding_engine import get_engine
from database_loader import DatabaseLoader
from face_matcher import FaceMatcher
import api_server


# ---------------- Logging ----------------
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format=LOG_FORMAT,
    datefmt=LOG_DATE_FORMAT,
    stream=sys.stdout,
)

logger = logging.getLogger(__name__)

# 🔥 DEPLOYMENT FINGERPRINT
print("🔥 MPIS AI ENGINE STABLE MODE 🔥")


# ---------------- Flask App ----------------
app = Flask(__name__)


# ---------------- Lazy Global State ----------------
_engine = None
_db_loader = None
_matcher = None


# ---------------- Lazy Load Functions ----------------

def get_engine_safe():
    global _engine
    if _engine is None:
        logger.info("[LAZY] Loading model...")
        _engine = get_engine()
    return _engine


def get_db_loader_safe():
    global _db_loader
    if _db_loader is None:
        logger.info("[LAZY] Initializing DB loader...")
        _db_loader = DatabaseLoader()
        # ❗ DO NOT load immediately (heavy)
        try:
            _db_loader.load()
            _db_loader.start_refresh_thread()
        except Exception as e:
            logger.warning("[DB] Load failed (will retry later): %s", e)
    return _db_loader


def get_matcher_safe():
    global _matcher
    if _matcher is None:
        logger.info("[LAZY] Creating matcher...")
        _matcher = FaceMatcher()
    return _matcher


# ---------------- Register Routes ----------------
api_server.register_routes(
    app,
    get_engine_safe,
    get_db_loader_safe,
    get_matcher_safe,
    None  # camera disabled in cloud
)


