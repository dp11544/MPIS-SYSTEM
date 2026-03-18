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


# ---------------- Flask App ----------------
app = Flask(__name__)


# ---------------- Global State ----------------
engine = None
db_loader = None
matcher = None
cam_manager = None


# ---------------- Init Function ----------------
def init_system():
    global engine, db_loader, matcher, cam_manager

    if engine is None:
        logger.info("[INIT] Loading model...")
        engine = get_engine()

    if db_loader is None:
        logger.info("[INIT] Loading database...")
        db_loader = DatabaseLoader()
        db_loader.load()
        db_loader.start_refresh_thread()

    if matcher is None:
        matcher = FaceMatcher()

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


# ---------------- INIT + REGISTER ROUTES (FIXED) ----------------
init_system()
api_server.register_routes(app, engine, db_loader, matcher, cam_manager)


# ---------------- Health ----------------
@app.route("/health")
def health():
    return {
        "status": "ok",
        "message": "AI Engine running"
    }