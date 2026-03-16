"""
camera_manager.py — Multi-camera CCTV stream manager with evidence capture.
"""

import logging
import time
import threading
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Tuple

import cv2  # type: ignore
import numpy as np  # type: ignore

import alert_service  # type: ignore

# Instantiate AlertService
alert_service_instance = alert_service.AlertService()
from database_loader import DatabaseLoader  # type: ignore
from embedding_engine import EmbeddingEngine  # type: ignore
from face_detector import FaceDetector  # type: ignore
from face_matcher import FaceMatcher  # type: ignore
from multi_frame_tracker import MultiFrameTracker, assign_face_slots  # type: ignore


logger = logging.getLogger(__name__)


# -------------------------------------------------------
# Camera Settings
# -------------------------------------------------------

TARGET_FPS = 15
FRAME_DELAY = 1.0 / TARGET_FPS
RECONNECT_DELAY = 3.0
MAX_RECONNECT_ATTEMPTS = 0


# -------------------------------------------------------
# Evidence Settings
# -------------------------------------------------------

EVIDENCE_DIR = "evidence"
os.makedirs(EVIDENCE_DIR, exist_ok=True)


# -------------------------------------------------------
# CameraStream
# -------------------------------------------------------

class CameraStream:

    def __init__(
        self,
        source,
        camera_id: str,
        engine: EmbeddingEngine,
        db_loader: DatabaseLoader,
        matcher: FaceMatcher,
        detector: FaceDetector,
    ) -> None:

        self.source = source
        self.camera_id = camera_id
        self.engine = engine
        self.db_loader = db_loader
        self.matcher = matcher
        self.detector = detector

        self.tracker = MultiFrameTracker(camera_id=camera_id)

        self._running = threading.Event()
        self._thread: Optional[threading.Thread] = None

        self._prev_centroids: Dict[int, Tuple[float, float]] = {}

        self._latest_frame = None
        self._frame_lock = threading.Lock()

    # ---------------------------------------------------

    def start(self) -> None:

        self._running.set()

        self._thread = threading.Thread(
            target=self._run,
            name=f"camera-{self.camera_id}",
            daemon=True,
        )

        self._thread.start()

        logger.info(
            "[CAMERA STREAM STARTED] cameraId=%s source=%s",
            self.camera_id,
            self.source,
        )

    # ---------------------------------------------------

    def stop(self) -> None:

        self._running.clear()

        if self._thread:
            self._thread.join(timeout=5.0)

    # ---------------------------------------------------

    def _save_evidence(
        self,
        frame: np.ndarray,
        bbox: Optional[np.ndarray],
        person_id: str,
    ) -> str:

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

        filename = (
            f"{person_id}_{self.camera_id}_{timestamp}_{uuid.uuid4().hex[:6]}.jpg"
        )

        filepath = os.path.join(EVIDENCE_DIR, filename)

        try:

            if bbox is not None:

                x1, y1, x2, y2 = bbox.astype(int)

                h, w = frame.shape[:2]

                x1 = max(0, x1)
                y1 = max(0, y1)
                x2 = min(w, x2)
                y2 = min(h, y2)

                face_crop = frame[y1:y2, x1:x2]

                if face_crop.size > 0:
                    cv2.imwrite(filepath, face_crop)
                else:
                    cv2.imwrite(filepath, frame)

            else:
                cv2.imwrite(filepath, frame)

            logger.info(
                "[EVIDENCE SAVED] camera=%s file=%s",
                self.camera_id,
                filepath,
            )

        except Exception as exc:

            logger.error("[EVIDENCE ERROR] %s", exc)

            filepath = ""

        return filepath

    # ---------------------------------------------------

    def _run(self) -> None:

        reconnect_count = 0

        while self._running.is_set():

            cap = self._open_capture()

            if cap is None:

                reconnect_count += 1

                if MAX_RECONNECT_ATTEMPTS > 0 and reconnect_count > MAX_RECONNECT_ATTEMPTS:

                    logger.error(
                        "[CAMERA] cameraId=%s max reconnect attempts reached",
                        self.camera_id,
                    )

                    break

                logger.warning(
                    "[CAMERA] cameraId=%s reconnecting in %.1fs (attempt %d)",
                    self.camera_id,
                    RECONNECT_DELAY,
                    reconnect_count,
                )

                time.sleep(RECONNECT_DELAY)

                continue

            reconnect_count = 0

            logger.info("[CAMERA] cameraId=%s stream opened", self.camera_id)

            self._process_capture(cap)

            cap.release()

            if self._running.is_set():

                logger.warning(
                    "[CAMERA] cameraId=%s stream lost — reconnecting",
                    self.camera_id,
                )

                time.sleep(RECONNECT_DELAY)

        logger.info("[CAMERA] cameraId=%s thread exited", self.camera_id)

    # ---------------------------------------------------

    def _open_capture(self) -> Optional[cv2.VideoCapture]:

        try:

            cap = cv2.VideoCapture(self.source)

            if cap.isOpened():
                return cap

            cap.release()

        except Exception as exc:

            logger.error(
                "[CAMERA] cameraId=%s open error: %s",
                self.camera_id,
                exc,
            )

        return None

    # ---------------------------------------------------

    def _process_capture(self, cap: cv2.VideoCapture) -> None:

        while self._running.is_set():

            frame_start = time.time()

            ret, frame = cap.read()

            if not ret or frame is None:

                logger.warning(
                    "[CAMERA] cameraId=%s dropped frame",
                    self.camera_id,
                )

                break

            self._process_frame(frame)

            elapsed = time.time() - frame_start

            sleep_time = FRAME_DELAY - elapsed

            if sleep_time > 0:
                time.sleep(sleep_time)

    # ---------------------------------------------------

    def _process_frame(self, frame: np.ndarray) -> None:

        with self._frame_lock:
            self._latest_frame = frame.copy()

        try:

            raw_faces = self.engine.get_faces(frame)

            if not raw_faces:
                return

            detected_faces = self.detector.filter(
                raw_faces,
                camera_id=self.camera_id,
            )

            if not detected_faces:
                return

            bboxes = [f.bbox for f in detected_faces]

            face_to_slot, self._prev_centroids = assign_face_slots(
                bboxes,
                self._prev_centroids,
            )

            database = self.db_loader.get_snapshot()

            for fi, face in enumerate(detected_faces):

                slot_id = face_to_slot[fi]

                centroid = self._prev_centroids[slot_id]

                emb = face.embedding

                result = self.matcher.match(emb, database)

                if result.is_confident:

                    should_alert = self.tracker.update(
                        slot_id=slot_id,  # FIXED
                        centroid=centroid,
                        person_name=result.person_name,
                        similarity=result.similarity,
                    )

                    if should_alert:

                        evidence_path = self._save_evidence(
                            frame,
                            face.bbox,
                            result.person_id or "unknown",
                        )

                        alert_service_instance.send_alert(
                            person_id=result.person_id or "",
                            person_name=result.person_name,
                            camera_id=self.camera_id,
                            similarity=result.similarity,
                            evidence_image=evidence_path,
                        )

                else:

                    self.tracker.reset_slot(slot_id)

        except Exception as exc:

            logger.error(
                "[CAMERA] cameraId=%s frame processing error: %s",
                self.camera_id,
                exc,
                exc_info=True,
            )

    # ---------------------------------------------------

    def get_latest_frame(self) -> Optional[np.ndarray]:

        with self._frame_lock:

            if self._latest_frame is None:
                return None

            return self._latest_frame.copy()


# -------------------------------------------------------
# CameraManager
# -------------------------------------------------------

class CameraManager:

    def __init__(
        self,
        engine: EmbeddingEngine,
        db_loader: DatabaseLoader,
    ) -> None:

        self.engine = engine
        self.db_loader = db_loader

        self.matcher = FaceMatcher()
        self.detector = FaceDetector()

        self._streams: List[CameraStream] = []

    # ---------------------------------------------------

    def add_camera(self, source, camera_id: str) -> None:

        stream = CameraStream(
            source=source,
            camera_id=camera_id,
            engine=self.engine,
            db_loader=self.db_loader,
            matcher=self.matcher,
            detector=self.detector,
        )

        self._streams.append(stream)

    # ---------------------------------------------------

    def start_all(self) -> None:

        if not self._streams:

            logger.warning("[CAMERA MANAGER] No cameras configured")

            return

        for stream in self._streams:
            stream.start()

        logger.info(
            "[CAMERA MANAGER] Started %d camera stream(s)",
            len(self._streams),
        )

    # ---------------------------------------------------

    def stop_all(self) -> None:

        for stream in self._streams:
            stream.stop()

        logger.info("[CAMERA MANAGER] All camera streams stopped")

    # ---------------------------------------------------

    def get_stats(self):

        return [
            {
                "camera_id": s.camera_id,
                "source": s.source,
            }
            for s in self._streams
        ]

    # ---------------------------------------------------

    def wait_forever(self) -> None:

        try:

            while any(
                s._thread and s._thread.is_alive()
                for s in self._streams
            ):
                time.sleep(1.0)

        except KeyboardInterrupt:

            logger.info("[CAMERA MANAGER] KeyboardInterrupt")

            self.stop_all()

    # ---------------------------------------------------

    def get_latest_frame(self, camera_id: Optional[str] = None) -> Optional[np.ndarray]:

        if not self._streams:
            return None

        if camera_id is not None:

            for s in self._streams:
                if s.camera_id == camera_id:
                    return s.get_latest_frame()

        return self._streams[0].get_latest_frame()