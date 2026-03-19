"""
camera_manager.py — Local camera + Cloud AI (Railway)
"""

import logging
import time
import threading
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Tuple

import cv2
import numpy as np
import requests

import alert_service

logger = logging.getLogger(__name__)

# ---------------- CONFIG ----------------
API_BASE_URL = "https://your-railway-url"  # 🔥 CHANGE THIS
EXTRACT_API = f"{API_BASE_URL}/extract-embedding"
RECOGNIZE_API = f"{API_BASE_URL}/recognize-face"

TARGET_FPS = 10
FRAME_SKIP = 3  # process every 3rd frame
FRAME_DELAY = 1.0 / TARGET_FPS

EVIDENCE_DIR = "evidence"
os.makedirs(EVIDENCE_DIR, exist_ok=True)

alert_service_instance = alert_service.AlertService()


# -------------------------------------------------------
# CameraStream
# -------------------------------------------------------

class CameraStream:

    def __init__(self, source, camera_id: str):
        self.source = source
        self.camera_id = camera_id

        self._running = threading.Event()
        self._thread: Optional[threading.Thread] = None

        self._latest_frame = None
        self._frame_lock = threading.Lock()

        self.frame_count = 0

    # ---------------------------------------------------

    def start(self):
        self._running.set()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    # ---------------------------------------------------

    def stop(self):
        self._running.clear()
        if self._thread:
            self._thread.join(timeout=5)

    # ---------------------------------------------------

    def _run(self):

        cap = cv2.VideoCapture(self.source)

        if not cap.isOpened():
            logger.error("[CAMERA] Cannot open source %s", self.source)
            return

        logger.info("[CAMERA STARTED] %s", self.camera_id)

        while self._running.is_set():

            start = time.time()

            ret, frame = cap.read()
            if not ret:
                continue

            with self._frame_lock:
                self._latest_frame = frame.copy()

            self.frame_count += 1

            # 🔥 Skip frames for performance
            if self.frame_count % FRAME_SKIP != 0:
                continue

            self._process_frame(frame)

            elapsed = time.time() - start
            if elapsed < FRAME_DELAY:
                time.sleep(FRAME_DELAY - elapsed)

        cap.release()

    # ---------------------------------------------------

    def _process_frame(self, frame):

        try:
            # Resize for speed
            frame_small = cv2.resize(frame, (640, 480))

            _, img_encoded = cv2.imencode('.jpg', frame_small)

            files = {
                "image": ("frame.jpg", img_encoded.tobytes(), "image/jpeg")
            }

            # -------- STEP 1: GET EMBEDDING --------
            res1 = requests.post(EXTRACT_API, files=files, timeout=3)

            if res1.status_code != 200:
                return

            embedding = res1.json()["embedding"]

            # -------- STEP 2: RECOGNITION --------
            res2 = requests.post(
                RECOGNIZE_API,
                json={"embedding": embedding},
                timeout=3
            )

            if res2.status_code != 200:
                return

            result = res2.json()

            if result.get("status") == "MATCH":

                logger.info(
                    "[MATCH] %s (%.2f)",
                    result.get("personName"),
                    result.get("similarity")
                )

                evidence_path = self._save_evidence(frame)

                alert_service_instance.send_alert(
                    person_id=result.get("personId", ""),
                    person_name=result.get("personName", ""),
                    camera_id=self.camera_id,
                    similarity=result.get("similarity", 0),
                    evidence_image=evidence_path,
                )

        except Exception as e:
            logger.error("[CLOUD ERROR] %s", e)

    # ---------------------------------------------------

    def _save_evidence(self, frame):

        filename = f"{self.camera_id}_{uuid.uuid4().hex[:6]}.jpg"
        path = os.path.join(EVIDENCE_DIR, filename)

        try:
            cv2.imwrite(path, frame)
        except:
            path = ""

        return path

    # ---------------------------------------------------

    def get_latest_frame(self):
        with self._frame_lock:
            if self._latest_frame is None:
                return None
            return self._latest_frame.copy()


# -------------------------------------------------------
# CameraManager
# -------------------------------------------------------

class CameraManager:

    def __init__(self):
        self._streams: List[CameraStream] = []

    def add_camera(self, source, camera_id: str):
        self._streams.append(CameraStream(source, camera_id))

    def start_all(self):

        if not self._streams:
            logger.warning("[CAMERA MANAGER] No cameras")
            return

        for s in self._streams:
            s.start()

        logger.info("[CAMERA MANAGER] Started %d camera(s)", len(self._streams))

    def stop_all(self):

        for s in self._streams:
            s.stop()

    def get_latest_frame(self):

        if not self._streams:
            return None

        return self._streams[0].get_latest_frame()