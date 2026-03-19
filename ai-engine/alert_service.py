import logging
import threading
import time
from dataclasses import dataclass
from typing import List, Optional, Deque
from collections import deque

import requests

from config import (
    BACKEND_ALERT_URL,
    BACKEND_REQUEST_TIMEOUT,
    ALERT_RETRY_COUNT,
    ALERT_RETRY_BACKOFFS,
    ALERT_HISTORY_LIMIT,
    ALGORITHM_VERSION,
    MODEL_USED,
)

logger = logging.getLogger(__name__)


# ---------------- AlertRecord ----------------
@dataclass
class AlertRecord:
    person_id: str
    person_name: str
    camera_id: str
    similarity: float
    confidence_level: str
    success: bool
    attempts: int
    dispatched_at: float

    http_status: Optional[int] = None
    error_message: Optional[str] = None
    evidence_image: Optional[str] = None

    @property
    def dispatched_at_ms(self) -> int:
        return int(self.dispatched_at * 1000)


# ---------------- AlertService ----------------
class AlertService:

    def __init__(self) -> None:
        self._history: Deque[AlertRecord] = deque(maxlen=ALERT_HISTORY_LIMIT)
        self._lock = threading.RLock()

        self._total_sent = 0
        self._total_failed = 0

        logger.info("[ALERT SERVICE] Initialised endpoint=%s", BACKEND_ALERT_URL)

    # ----------------------------------------------------------

    def send_alert(
        self,
        person_id: str,
        person_name: str,
        camera_id: str,
        similarity: float,
        evidence_image: Optional[str] = None,
    ) -> None:
        """
        🔥 NON-BLOCKING ALERT (IMPORTANT FIX)
        """

        threading.Thread(
            target=self._send_alert_internal,
            args=(person_id, person_name, camera_id, similarity, evidence_image),
            daemon=True,
        ).start()

    # ----------------------------------------------------------

    def _send_alert_internal(
        self,
        person_id: str,
        person_name: str,
        camera_id: str,
        similarity: float,
        evidence_image: Optional[str],
    ) -> None:

        now = time.time()

        confidence_level = self._classify_confidence(similarity)

        payload = {
            "personId": person_id,
            "personName": person_name,
            "cameraId": camera_id,
            "similarity": round(float(similarity), 4),
            "confidenceLevel": confidence_level,
            "algorithmVersion": ALGORITHM_VERSION,
            "modelUsed": MODEL_USED,
            "detectedAt": int(now * 1000),
        }

        if evidence_image:
            payload["evidenceImage"] = evidence_image

        success, http_status, error_msg, attempts = self._dispatch_with_retry(payload)

        record = AlertRecord(
            person_id=person_id,
            person_name=person_name,
            camera_id=camera_id,
            similarity=round(float(similarity), 4),
            confidence_level=confidence_level,
            success=success,
            attempts=attempts,
            dispatched_at=now,
            http_status=http_status,
            error_message=error_msg,
            evidence_image=evidence_image,
        )

        with self._lock:
            self._history.append(record)

            if success:
                self._total_sent += 1
                logger.info("[ALERT] ✔ sent person=%s cam=%s", person_name, camera_id)
            else:
                self._total_failed += 1
                logger.error("[ALERT] ✘ failed: %s", error_msg)

    # ----------------------------------------------------------

    def _dispatch_with_retry(self, payload: dict):

        attempts = 0
        last_error = "No attempt"
        last_status: Optional[int] = None

        for attempt_num in range(ALERT_RETRY_COUNT + 1):

            attempts += 1

            try:
                response = requests.post(
                    BACKEND_ALERT_URL,
                    json=payload,
                    timeout=BACKEND_REQUEST_TIMEOUT,
                )

                last_status = response.status_code

                if response.ok:
                    return True, last_status, None, attempts

                last_error = f"HTTP {response.status_code}"

            except Exception as exc:
                last_error = str(exc)

            if attempt_num < ALERT_RETRY_COUNT:
                backoff = (
                    ALERT_RETRY_BACKOFFS[min(attempt_num, len(ALERT_RETRY_BACKOFFS) - 1)]
                    if ALERT_RETRY_BACKOFFS
                    else 1.0
                )
                time.sleep(backoff)

        return False, last_status, last_error, attempts

    # ----------------------------------------------------------

    def get_recent_alerts(self, limit: int = 20) -> List[dict]:

        with self._lock:
            records = list(self._history)

        records.reverse()

        return [
            {
                "personId": r.person_id,
                "personName": r.person_name,
                "cameraId": r.camera_id,
                "similarity": r.similarity,
                "confidenceLevel": r.confidence_level,
                "success": r.success,
                "attempts": r.attempts,
                "detectedAt": r.dispatched_at_ms,
                "httpStatus": r.http_status,
                "error": r.error_message,
            }
            for r in records[:limit]
        ]

    # ----------------------------------------------------------

    @staticmethod
    def _classify_confidence(similarity: float) -> str:
        return "HIGH" if similarity >= 0.80 else "MEDIUM"