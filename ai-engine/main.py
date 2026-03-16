import logging
import os
import signal
import sys
import threading
import time

from config import LOG_FORMAT, LOG_DATE_FORMAT, LOG_LEVEL  # type: ignore


# ---------------------------------------------------------------------
# Logging Setup
# ---------------------------------------------------------------------

def _setup_logging():

    logging.basicConfig(
        level=getattr(logging, LOG_LEVEL, logging.INFO),
        format=LOG_FORMAT,
        datefmt=LOG_DATE_FORMAT,
        stream=sys.stdout,
    )

    logging.getLogger("insightface").setLevel(logging.WARNING)
    logging.getLogger("onnxruntime").setLevel(logging.WARNING)
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


_setup_logging()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------
# Safe imports
# ---------------------------------------------------------------------

from embedding_engine import get_engine  # type: ignore
from database_loader import DatabaseLoader  # type: ignore
from face_matcher import FaceMatcher  # type: ignore
from camera_manager import CameraManager  # type: ignore
import api_server  # type: ignore


# ---------------------------------------------------------------------
# Camera Parsing
# ---------------------------------------------------------------------

def _parse_cameras():

    raw_sources = os.environ.get("MPIS_CAMERAS", "0")
    raw_ids = os.environ.get("MPIS_CAM_IDS", "CAM_01")

    sources = [s.strip() for s in raw_sources.split(",") if s.strip()]
    cam_ids = [c.strip() for c in raw_ids.split(",") if c.strip()]

    parsed_sources = []

    for s in sources:
        try:
            parsed_sources.append(int(s))
        except ValueError:
            parsed_sources.append(s)

    if len(cam_ids) < len(parsed_sources):
        logger.warning("[CONFIG] Not enough camera IDs provided")

    while len(cam_ids) < len(parsed_sources):
        cam_ids.append(f"CAM_{len(cam_ids)+1:02d}")

    return list(zip(parsed_sources, cam_ids))


# ---------------------------------------------------------------------
# System Health Monitor
# ---------------------------------------------------------------------

class SystemHealthMonitor(threading.Thread):

    def __init__(self, db_loader, cam_manager):

        super().__init__(daemon=True)

        self.db_loader = db_loader
        self.cam_manager = cam_manager

        self._running = threading.Event()
        self._running.set()

        self.start_time = time.time()

    def run(self):

        while self._running.is_set():

            try:

                uptime = int(time.time() - self.start_time)

                db_stats = self.db_loader.get_stats()
                cam_stats = self.cam_manager.get_stats()

                persons = getattr(db_stats, "total_persons", "unknown")
                cameras = len(cam_stats) if cam_stats else 0

                logger.info(
                    "[SYSTEM HEALTH] uptime=%ss persons=%s cameras=%s",
                    uptime,
                    persons,
                    cameras,
                )

            except Exception as exc:
                logger.warning("[HEALTH MONITOR ERROR] %s", exc)

            time.sleep(60)

    def stop(self):
        self._running.clear()


# ---------------------------------------------------------------------
# Shutdown Controller
# ---------------------------------------------------------------------

class ShutdownController:

    def __init__(self):
        self.shutdown_event = threading.Event()

    def signal_handler(self, sig, _frame):
        logger.info("[SYSTEM] Shutdown signal received (%s)", sig)
        self.shutdown_event.set()


shutdown_controller = ShutdownController()


# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------

def main():

    logger.info("=" * 60)
    logger.info("[AI ENGINE STARTED] Missing Person Intelligence System")
    logger.info("=" * 60)

    signal.signal(signal.SIGINT, shutdown_controller.signal_handler)
    signal.signal(signal.SIGTERM, shutdown_controller.signal_handler)

    # -----------------------------------------------------
    # STEP 1: Load AI model
    # -----------------------------------------------------

    logger.info("[STEP 1/5] Loading InsightFace model")

    try:
        engine = get_engine()
    except Exception as exc:
        logger.critical("[STARTUP FAILED] Cannot load AI model: %s", exc)
        sys.exit(1)

    logger.info("[MODEL READY]")

    # -----------------------------------------------------
    # STEP 2: Load Database
    # -----------------------------------------------------

    logger.info("[STEP 2/5] Loading database")

    db_loader = DatabaseLoader()

    success = False

    for attempt in range(1, 4):

        success = db_loader.load()

        if success:
            break

        logger.warning(
            "[DATABASE] Attempt %d/3 failed — retrying in 5s",
            attempt,
        )

        time.sleep(5)

    if success:
        logger.info("[DATABASE LOADED]")
    else:
        logger.warning("[DATABASE] Starting with empty DB")

    # -----------------------------------------------------
    # STEP 3: Start DB refresh
    # -----------------------------------------------------

    logger.info("[STEP 3/5] Starting DB refresh thread")
    db_loader.start_refresh_thread()

    # -----------------------------------------------------
    # STEP 4: Initialize matcher, cameras, API
    # -----------------------------------------------------

    logger.info("[STEP 4/5] Starting API server and cameras")

    matcher = FaceMatcher()

    cameras = _parse_cameras()

    cam_manager = CameraManager(
        engine=engine,
        db_loader=db_loader,
    )

    for source, cam_id in cameras:
        cam_manager.add_camera(source=source, camera_id=cam_id)

    # start API server
    api_server.start_server(engine, db_loader, matcher, cam_manager)

    logger.info("[API SERVER READY] http://127.0.0.1:5000")

    # -----------------------------------------------------
    # STEP 5: Start cameras
    # -----------------------------------------------------

    logger.info("[STEP 5/5] Starting %d camera(s)", len(cameras))

    cam_manager.start_all()

    logger.info("[CAMERAS RUNNING]")

    # -----------------------------------------------------
    # Health monitor
    # -----------------------------------------------------

    health_monitor = SystemHealthMonitor(db_loader, cam_manager)
    health_monitor.start()

    logger.info("=" * 60)
    logger.info("[AI ENGINE RUNNING] Press Ctrl+C to exit")
    logger.info("=" * 60)

    # -----------------------------------------------------
    # Main loop
    # -----------------------------------------------------

    while not shutdown_controller.shutdown_event.is_set():
        time.sleep(1)

    # -----------------------------------------------------
    # Shutdown
    # -----------------------------------------------------

    logger.info("[SHUTDOWN] Stopping services")

    health_monitor.stop()
    cam_manager.stop_all()
    db_loader.stop_refresh_thread()

    try:
        api_server.stop_server()
    except Exception:
        pass

    logger.info("[AI ENGINE STOPPED]")


# ---------------------------------------------------------------------

if __name__ == "__main__":

    try:
        main()
    except Exception as exc:
        logger.critical("[FATAL ERROR] %s", exc)
        sys.exit(1)