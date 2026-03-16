"""
alert_service.py — Production alert dispatch service for MPIS AI Engine.
"""

import logging
import threading
import time
from dataclasses import dataclass
from typing import List, Optional, Deque
from collections import deque

import requests  # type: ignore

from config import (  # type: ignore
    BACKEND_ALERT_URL,
    BACKEND_REQUEST_TIMEOUT,
    ALERT_RETRY_COUNT,
    ALERT_RETRY_BACKOFFS,
    ALERT_HISTORY_LIMIT,
    ALGORITHM_VERSION,
    MODEL_USED,
)

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────
# AlertRecord
# ──────────────────────────────────────────────────────────────

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

    def __repr__(self) -> str:
        return (
            f"AlertRecord(person='{self.person_name}' cam='{self.camera_id}' "
            f"sim={self.similarity:.4f} success={self.success} attempts={self.attempts})"
        )


# ──────────────────────────────────────────────────────────────
# AlertService
# ──────────────────────────────────────────────────────────────

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
    ) -> bool:

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

        # Optional evidence image
        if evidence_image:
            payload["evidenceImage"] = evidence_image

        logger.info(
            "[ALERT SERVICE] Dispatching alert person=%s cam=%s sim=%.4f",
            person_name,
            camera_id,
            similarity,
        )

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

                logger.info(
                    "[ALERT SERVICE] ✔ delivered person=%s cam=%s http=%s attempts=%d",
                    person_name,
                    camera_id,
                    http_status,
                    attempts,
                )
            else:

                self._total_failed += 1

                logger.error(
                    "[ALERT SERVICE] ✘ failed after %d attempts: %s",
                    attempts,
                    error_msg,
                )

        return success

    # ----------------------------------------------------------

    def get_recent_alerts(self, limit: int = 20) -> List[dict]:

        with self._lock:
            records = list(self._history)

        records.reverse()

        result = []

        for rec in records[:limit]:

            result.append(
                {
                    "personId": rec.person_id,
                    "personName": rec.person_name,
                    "cameraId": rec.camera_id,
                    "similarity": rec.similarity,
                    "confidenceLevel": rec.confidence_level,
                    "success": rec.success,
                    "attempts": rec.attempts,
                    "detectedAt": rec.dispatched_at_ms,
                    "httpStatus": rec.http_status,
                    "error": rec.error_message,
                    "evidenceImage": rec.evidence_image,
                }
            )

        return result

    # ----------------------------------------------------------

    def get_metrics(self) -> dict:

        with self._lock:

            return {
                "total_sent": self._total_sent,
                "total_failed": self._total_failed,
                "history_size": len(self._history),
            }

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

                logger.warning(
                    "[ALERT SERVICE] attempt %d failed http=%s",
                    attempt_num + 1,
                    response.status_code,
                )

            except requests.exceptions.ConnectionError:

                last_error = "Connection refused"

            except requests.exceptions.Timeout:

                last_error = "Request timeout"

            except Exception as exc:

                last_error = str(exc)

            logger.warning(
                "[ALERT SERVICE] attempt %d error: %s",
                attempt_num + 1,
                last_error,
            )

            if attempt_num < ALERT_RETRY_COUNT:

                if ALERT_RETRY_BACKOFFS:
                    backoff = ALERT_RETRY_BACKOFFS[min(attempt_num, len(ALERT_RETRY_BACKOFFS) - 1)]
                else:
                    backoff = 1.0

                time.sleep(backoff)

        return False, last_status, last_error, attempts

    # ----------------------------------------------------------

    @staticmethod
    def _classify_confidence(similarity: float) -> str:

        return "HIGH" if similarity >= 0.80 else "MEDIUM"

    # ----------------------------------------------------------

    def __repr__(self) -> str:

        return (
            f"AlertService(sent={self._total_sent} "
            f"failed={self._total_failed} history={len(self._history)})"
        )