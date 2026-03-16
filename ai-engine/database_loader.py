"""
database_loader.py — Production thread-safe in-memory face embedding database.

Architecture:
  - DatabaseLoader maintains a validated, normalised embedding store under
    a threading.RLock; all reads and writes are serialized.
  - A background daemon thread (start_refresh_thread) fetches from the backend
    every DB_REFRESH_INTERVAL_SECONDS; on failure it applies exponential back-off
    up to DB_BACKOFF_MAX_SECONDS, to avoid hammering a downed backend.
  - get_snapshot() returns a shallow copy of the store that callers can
    iterate without holding the lock.
  - DatabaseStats tracks refresh health for /health endpoint reporting.

Public API:
    db = DatabaseLoader()
    db.load()                      → bool
    db.start_refresh_thread()
    db.stop_refresh_thread()
    snapshot = db.get_snapshot()   → List[PersonRecord]
    stats    = db.get_stats()      → DatabaseStats
"""

import logging
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import numpy as np       # type: ignore
import requests          # type: ignore

from config import (     # type: ignore
    BACKEND_EMBEDDINGS_URL,
    BACKEND_REQUEST_TIMEOUT,
    DB_REFRESH_INTERVAL_SECONDS,
    DB_BACKOFF_BASE_SECONDS,
    DB_BACKOFF_MAX_SECONDS,
    EMBEDDING_DIM,
)

logger = logging.getLogger(__name__)

# ── Public type aliases ────────────────────────────────────────────────────────
PersonRecord  = Dict[str, Any]   # {personId, name, embeddings: [np.ndarray]}
DatabaseStore = List[PersonRecord]


# ─── DatabaseStats Dataclass ──────────────────────────────────────────────────

@dataclass
class DatabaseStats:
    """
    Live health and size metrics for the in-memory embedding database.

    Attributes:
        total_persons       : Number of valid persons currently in memory.
        total_embeddings    : Total embedding vectors across all persons.
        last_refresh_time   : Unix timestamp of last successful backend fetch.
        last_refresh_success: True if the most recent refresh attempt succeeded.
        consecutive_failures: Number of consecutive refresh failures (resets on success).
        refresh_failures    : Lifetime count of backend fetch failures.
        refresh_successes   : Lifetime count of successful backend fetches.
        backoff_seconds     : Current backoff interval before next retry attempt.
    """
    total_persons: int = 0
    total_embeddings: int = 0
    last_refresh_time: float = 0.0
    last_refresh_success: bool = False
    consecutive_failures: int = 0
    refresh_failures: int = 0
    refresh_successes: int = 0
    backoff_seconds: float = DB_BACKOFF_BASE_SECONDS


# ─── Standalone Validation Helpers ────────────────────────────────────────────

def validate_person_record(item: Any) -> Optional[str]:
    """
    Validate a single raw person record from the backend JSON array.

    Expected shape:
        {
            "personId":  "P001",
            "name":      "Durga Prasad",
            "embeddings": [[512 floats], [512 floats], ...]
        }

    Args:
        item: Candidate object (should be a dict).

    Returns:
        None if valid; a human-readable error string if invalid.
    """
    if not isinstance(item, dict):
        return f"Record is not a dict; got {type(item).__name__}"

    name = item.get("name")
    if not name or not isinstance(name, str) or not name.strip():
        return "Missing or blank 'name' field"

    raw_embs = item.get("embeddings")
    if not isinstance(raw_embs, list) or len(raw_embs) == 0:
        return f"'embeddings' must be a non-empty list; got {type(raw_embs).__name__}"

    return None   # valid


def _to_float32_array(value: Any) -> Optional[np.ndarray]:
    """
    Convert a list or array-like value to a float32 numpy array.

    Args:
        value: Raw embedding data from JSON (list of floats).

    Returns:
        1-D float32 np.ndarray, or None if conversion fails.
    """
    try:
        arr = np.array(value, dtype=np.float32)
        if arr.ndim != 1:
            return None
        return arr
    except (ValueError, TypeError):
        return None


def normalize_embeddings(raw_vecs: List[Any], person_name: str) -> List[np.ndarray]:
    """
    Parse, validate, and L2-normalize a list of raw embedding vectors.

    Rejects:
        - Vectors that cannot be converted to float32.
        - Vectors with wrong dimension (must be EMBEDDING_DIM = 512).
        - Vectors with near-zero norm (< 1e-6).

    Args:
        raw_vecs    : List of raw vectors as received from the backend.
        person_name : Used only for log messages.

    Returns:
        List of valid, L2-normalised float32 np.ndarray vectors.
    """
    valid: List[np.ndarray] = []
    for i, raw in enumerate(raw_vecs):
        vec = _to_float32_array(raw)
        if vec is None:
            logger.warning(
                "[DATABASE] '%s' embedding #%d: cannot convert to float32 — skipped",
                person_name, i,
            )
            continue
        if vec.shape != (EMBEDDING_DIM,):
            logger.warning(
                "[DATABASE] '%s' embedding #%d: wrong shape %s (expected (%d,)) — skipped",
                person_name, i, vec.shape, EMBEDDING_DIM,
            )
            continue
        norm = float(np.linalg.norm(vec))
        if norm < 1e-6:
            logger.warning(
                "[DATABASE] '%s' embedding #%d: near-zero norm %.2e — skipped",
                person_name, i, norm,
            )
            continue
        valid.append((vec / norm).astype(np.float32))

    return valid


# ─── DatabaseLoader ────────────────────────────────────────────────────────────

class DatabaseLoader:
    """
    Thread-safe in-memory face embedding database with background auto-refresh.

    Lifecycle:
        db = DatabaseLoader()
        db.load()                      # Synchronous initial load (returns bool)
        db.start_refresh_thread()      # Kick off background refresh daemon

    During operation:
        snapshot = db.get_snapshot()   # Safe to call from any thread
        stats    = db.get_stats()      # For /health API reporting

    Shutdown:
        db.stop_refresh_thread()       # Signal background thread to exit
    """

    def __init__(self) -> None:
        self._db: DatabaseStore = []
        self._lock = threading.RLock()
        self._stats = DatabaseStats()
        self._refresh_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._start_time = time.time()
        logger.info("[DATABASE] DatabaseLoader initialised (endpoint=%s)", BACKEND_EMBEDDINGS_URL)

    # ── Public API ────────────────────────────────────────────────────────────

    def load(self) -> bool:
        """
        Synchronously fetch and validate the embedding database from the backend.

        On success: updates the in-memory store and resets failure counters.
        On failure: keeps the previous store intact; increments failure counter.

        Returns:
            True on success, False on any failure.
        """
        logger.info("[DATABASE] Fetching embeddings from %s ...", BACKEND_EMBEDDINGS_URL)
        raw_data = self._fetch_from_backend()
        if raw_data is None:
            self._record_failure()
            return False

        new_db = self._parse_records(raw_data)
        total_embs = sum(len(p["embeddings"]) for p in new_db)

        with self._lock:
            self._db = new_db
            self._stats.total_persons = len(new_db)
            self._stats.total_embeddings = total_embs
            self._stats.last_refresh_time = time.time()
            self._stats.last_refresh_success = True
            self._stats.consecutive_failures = 0
            self._stats.refresh_successes += 1
            self._stats.backoff_seconds = DB_BACKOFF_BASE_SECONDS

        logger.info(
            "[DATABASE LOADED] persons=%d  total_embeddings=%d",
            len(new_db), total_embs,
        )
        return True

    def get_snapshot(self) -> DatabaseStore:
        """
        Return a thread-safe shallow copy of the current embedding database.

        The returned list is safe to iterate without holding the internal lock;
        however, the PersonRecord dicts themselves are shared references.

        Returns:
            List of PersonRecord dicts.
        """
        with self._lock:
            return list(self._db)

    def get_stats(self) -> DatabaseStats:
        """
        Return a copy of the current database statistics.

        Returns:
            DatabaseStats dataclass snapshot.
        """
        with self._lock:
            import copy
            return copy.copy(self._stats)

    def start_refresh_thread(self) -> None:
        """
        Start the background daemon thread that refreshes the DB periodically.

        If a refresh thread is already running, this method is a no-op.
        """
        with self._lock:
            if self._refresh_thread and self._refresh_thread.is_alive():  # type: ignore[union-attr]
                logger.warning("[DATABASE] Refresh thread already running — ignoring start request")
                return

        self._stop_event.clear()
        self._refresh_thread = threading.Thread(
            target=self._refresh_loop,
            name="db-refresh",
            daemon=True,
        )
        self._refresh_thread.start()  # type: ignore[union-attr]
        logger.info(
            "[DATABASE] Background refresh thread started (interval=%ds, backoff_base=%.1fs)",
            DB_REFRESH_INTERVAL_SECONDS, DB_BACKOFF_BASE_SECONDS,
        )

    def stop_refresh_thread(self) -> None:
        """Signal the background refresh thread to stop at the next sleep boundary."""
        self._stop_event.set()
        logger.info("[DATABASE] Refresh thread stop signal sent")

    # ── Internal: background loop ─────────────────────────────────────────────

    def _refresh_loop(self) -> None:
        """
        Background refresh daemon.

        Sleeps for DB_REFRESH_INTERVAL_SECONDS, then calls load().
        On failure applies exponential backoff (doubles each time up to DB_BACKOFF_MAX_SECONDS).
        On success resets the backoff to the base value.
        """
        while not self._stop_event.wait(timeout=DB_REFRESH_INTERVAL_SECONDS):
            logger.info("[DATABASE] Scheduled refresh triggered")
            success = self.load()
            if not success:
                backoff = self._compute_backoff()
                logger.warning(
                    "[DATABASE] Refresh failed — waiting %.1fs before retry  "
                    "(consecutive_failures=%d)",
                    backoff, self._stats.consecutive_failures,
                )
                # Apply extra backoff sleep on top of the normal interval
                self._stop_event.wait(timeout=backoff)
            else:
                logger.info(
                    "[DATABASE] Refresh succeeded (persons=%d)",
                    self._stats.total_persons,
                )

    def _compute_backoff(self) -> float:
        """
        Return the current exponential backoff wait time in seconds.

        Doubles with each consecutive failure up to DB_BACKOFF_MAX_SECONDS.
        """
        failures = self._stats.consecutive_failures
        backoff = min(DB_BACKOFF_BASE_SECONDS * (2 ** (failures - 1)), DB_BACKOFF_MAX_SECONDS)
        with self._lock:
            self._stats.backoff_seconds = backoff
        return backoff

    # ── Internal: backend fetch ────────────────────────────────────────────────

    def _fetch_from_backend(self) -> Optional[list]:
        """
        HTTP GET /api/persons/embeddings → raw JSON list.

        Returns the parsed list on success, None on any network/HTTP/JSON error.
        """
        try:
            response = requests.get(
                BACKEND_EMBEDDINGS_URL,
                timeout=BACKEND_REQUEST_TIMEOUT,
            )
            response.raise_for_status()
        except requests.exceptions.ConnectionError:
            logger.error(
                "[DATABASE] Connection refused — backend unreachable at %s",
                BACKEND_EMBEDDINGS_URL,
            )
            return None
        except requests.exceptions.Timeout:
            logger.error(
                "[DATABASE] Request timed out after %ds",
                BACKEND_REQUEST_TIMEOUT,
            )
            return None
        except requests.exceptions.HTTPError as exc:
            logger.error("[DATABASE] Backend returned HTTP error: %s", exc)
            return None
        except Exception as exc:
            logger.error("[DATABASE] Unexpected fetch error: %s", exc)
            return None

        try:
            raw = response.json()
        except ValueError:
            logger.error("[DATABASE] Backend response is not valid JSON")
            return None

        if not isinstance(raw, list):
            logger.error(
                "[DATABASE] Expected JSON array from backend, got %s",
                type(raw).__name__,
            )
            return None

        logger.debug("[DATABASE] Received %d raw records from backend", len(raw))
        return raw

    def _record_failure(self) -> None:
        """Increment failure counters."""
        with self._lock:
            self._stats.last_refresh_success = False
            self._stats.consecutive_failures += 1
            self._stats.refresh_failures += 1

    # ── Internal: parsing ──────────────────────────────────────────────────────

    @staticmethod
    def _parse_records(raw_data: list) -> DatabaseStore:
        """
        Parse and validate a list of raw person records from the backend.

        Skips records that fail validate_person_record().
        Skips persons with zero valid embeddings after normalization.

        Args:
            raw_data: Raw list from backend JSON.

        Returns:
            List of validated PersonRecord dicts.
        """
        result: DatabaseStore = []
        skipped_records = 0
        skipped_embeddings = 0

        for item in raw_data:
            # ── Record-level validation ────────────────────────────────────
            error = validate_person_record(item)
            if error:
                logger.warning("[DATABASE] Skipping invalid record: %s | raw=%s", error, str(item)[:120])
                skipped_records += 1
                continue

            person_id = item.get("personId") or ""
            name      = item.get("name", "").strip()
            raw_embs  = item.get("embeddings", [])

            # ── Embedding normalization ────────────────────────────────────
            raw_count = len(raw_embs)
            valid_embs = normalize_embeddings(raw_embs, name)
            dropped = raw_count - len(valid_embs)
            if dropped > 0:
                skipped_embeddings += dropped

            if not valid_embs:
                logger.warning(
                    "[DATABASE] '%s' (id=%s) has no valid embeddings after normalization — excluded",
                    name, person_id,
                )
                skipped_records += 1
                continue

            result.append({
                "personId":   person_id,
                "name":       name,
                "embeddings": valid_embs,
            })
            logger.debug(
                "[DATABASE] Loaded '%s' (id=%s) → %d embeddings",
                name, person_id, len(valid_embs),
            )

        if skipped_records or skipped_embeddings:
            logger.warning(
                "[DATABASE] Parse complete: loaded=%d  skipped_records=%d  skipped_embeddings=%d",
                len(result), skipped_records, skipped_embeddings,
            )
        return result

    def __repr__(self) -> str:
        stats = self.get_stats()
        return (
            f"DatabaseLoader(persons={stats.total_persons} "
            f"embeddings={stats.total_embeddings} "
            f"successes={stats.refresh_successes} "
            f"failures={stats.refresh_failures})"
        )
