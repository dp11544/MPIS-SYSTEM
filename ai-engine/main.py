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
print("🔥 MPIS AI ENGINE v3 LIVE 🔥")


# ---------------- Flask App ----------------
app = Flask(__name__)


# ---------------- Global State ----------------
engine = None
db_loader = None
matcher = None
cam_manager = None
initialized = False


# ---------------- Init Function ----------------
def init_system():
    global engine, db_loader, matcher, cam_manager, initialized

    if initialized:
        logger.info("[INIT] Already initialized")
        return

    logger.info("[INIT] Starting...")

    try:
        # -------- MODEL --------
        if engine is None:
            logger.info("[INIT] Loading model...")
            engine = get_engine()

        # -------- DATABASE --------
        if db_loader is None:
            logger.info("[INIT] Loading database...")
            db_loader = DatabaseLoader()
            db_loader.load()
            db_loader.start_refresh_thread()

        # -------- MATCHER --------
        if matcher is None:
            logger.info("[INIT] Creating matcher...")
            matcher = FaceMatcher()

        # -------- CAMERA --------
        if cam_manager is None:
            ENABLE_CAMERA = os.getenv("ENABLE_CAMERA", "false").lower() == "true"

            if ENABLE_CAMERA:
                from camera_manager import CameraManager
                cam_manager = CameraManager(engine=engine, db_loader=db_loader)
                cam_manager.add_camera(0, "CAM_01")
                cam_manager.start_all()
                logger.info("[CAMERA ENABLED]")
            else:
                logger.info("[CAMERA DISABLED]")

        initialized = True
        logger.info("[INIT SUCCESS]")

    except Exception as e:
        logger.exception("[INIT FAILED]")
        raise e


# ---------------- SAFE INIT ----------------
init_system()

# 🔴 HARD FAIL EARLY
if engine is None:
    raise RuntimeError("Engine failed to initialize")

if db_loader is None:
    raise RuntimeError("DB loader failed to initialize")

if matcher is None:
    raise RuntimeError("Matcher failed to initialize")


# ---------------- Register Routes ----------------
api_server.register_routes(app, engine, db_loader, matcher, cam_manager)


# ---------------- Health ----------------
@app.route("/health")
def health():
    return {
        "status": "ok",
        "message": "AI Engine running"
    }