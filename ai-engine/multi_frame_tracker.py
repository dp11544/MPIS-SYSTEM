"""
multi_frame_tracker.py — Slot-based multi-frame identity confirmation tracker.

Problem this solves:
  A single CONFIDENT_MATCH on one frame is unreliable — lighting changes, partial
  occlusion, or motion blur can produce momentary false positives.  This module
  requires the same identity to be confirmed on REQUIRED_FRAMES consecutive frames
  within TRACKER_WINDOW_SECONDS before an alert is fired.

Architecture:
  - One MultiFrameTracker instance per camera stream.
  - Faces are assigned to "slots" by centroid proximity across frames.
  - Each slot maintains its own _SlotState with detection counters and timing.
  - Alerts fire at most once per (person, camera) pair per ALERT_COOLDOWN_SECONDS.
  - Stale slots (no update for SLOT_EXPIRY_SECONDS) are automatically evicted.
  - A cooldown registry prunes old entries to prevent unbounded memory growth.

Public API:
    tracker = MultiFrameTracker(camera_id="CAM_01")
    fired   = tracker.update(slot_id, centroid, person_name, similarity)
    tracker.reset_slot(slot_id)
    stats   = tracker.get_stats()
    slots   = tracker.get_active_slots()
    assign_face_slots(bboxes, previous_centroids)   → (face_to_slot, new_centroids)
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

import numpy as np  # type: ignore

from config import (  # type: ignore
    ALERT_COOLDOWN_SECONDS,
    REQUIRED_FRAMES,
    SLOT_EXPIRY_SECONDS,
    TRACKER_WINDOW_SECONDS,
    CENTROID_DISTANCE_THRESHOLD,
    COOLDOWN_PRUNE_INTERVAL,
)

logger = logging.getLogger(__name__)


# ─── _SlotState Dataclass ─────────────────────────────────────────────────────

@dataclass
class _SlotState:
    """
    Per-slot tracking state maintained between consecutive frames.

    Attributes:
        last_person          : Name of the last person confirmed in this slot.
        count                : Consecutive CONFIDENT frames for current identity.
        confirmed_count      : Total number of times this slot fired an alert.
        start_time           : Monotonic time when the current identity run started.
        last_update          : Monotonic time of the most recent update() call.
        last_alert_time      : Monotonic time when the last alert was fired (or 0).
        alert_suppressed_count: Number of times an alert was blocked by cooldown.
    """
    last_person: Optional[str] = None
    count: int = 0
    confirmed_count: int = 0
    start_time: float = field(default_factory=time.monotonic)
    last_update: float = field(default_factory=time.monotonic)
    last_alert_time: float = 0.0
    alert_suppressed_count: int = 0

    def reset_run(self, person_name: Optional[str] = None) -> None:
        """Reset the consecutive-frame counter, optionally setting a new identity."""
        self.last_person = person_name
        self.count = 0
        self.start_time = time.monotonic()

    def is_expired(self) -> bool:
        """Return True if this slot has not been updated for SLOT_EXPIRY_SECONDS."""
        return (time.monotonic() - self.last_update) > SLOT_EXPIRY_SECONDS

    def is_in_cooldown(self) -> bool:
        """Return True if an alert was fired recently and the cooldown is active."""
        if self.last_alert_time == 0.0:
            return False
        return (time.monotonic() - self.last_alert_time) < ALERT_COOLDOWN_SECONDS

    def time_window_exceeded(self) -> bool:
        """Return True if the current frame run exceeds TRACKER_WINDOW_SECONDS."""
        return (time.monotonic() - self.start_time) > TRACKER_WINDOW_SECONDS


# ─── TrackerStats Dataclass ───────────────────────────────────────────────────

@dataclass
class TrackerStats:
    """
    Lifetime statistics for a single MultiFrameTracker instance.

    Attributes:
        camera_id           : Which camera this tracker belongs to.
        total_updates       : Total update() calls received.
        total_alerts_fired  : Total confirmed alerts sent downstream.
        total_suppressions  : Alerts blocked by cooldown.
        total_resets        : Identity changes that reset the counter.
        active_slot_count   : Current number of open face slots.
        cooldown_entries    : Number of entries in the cooldown registry.
    """
    camera_id: str
    total_updates: int = 0
    total_alerts_fired: int = 0
    total_suppressions: int = 0
    total_resets: int = 0
    active_slot_count: int = 0
    cooldown_entries: int = 0


# ─── MultiFrameTracker ────────────────────────────────────────────────────────

class MultiFrameTracker:
    """
    Slot-based multi-frame identity confirmation tracker for a single camera.

    Workflow per frame:
        1. CameraStream calls assign_face_slots() to map face detections to slots.
        2. For each slot, CameraStream calls update(slot_id, centroid, name, sim).
        3. update() accumulates consecutive detections of the same identity.
        4. After REQUIRED_FRAMES consecutive CONFIDENT detections within
           TRACKER_WINDOW_SECONDS, update() returns True → fire alert.
        5. After firing, the slot enters ALERT_COOLDOWN_SECONDS of suppression.
        6. Identity changes inside a slot reset the counter immediately.

    Usage:
        tracker = MultiFrameTracker(camera_id="CAM_01")
        confirmed = tracker.update(slot_id=0, centroid=(cx, cy),
                                   person_name="Alice", similarity=0.87)
        if confirmed:
            alert_service.send_alert(...)
    """

    def __init__(self, camera_id: str = "UNKNOWN") -> None:
        self.camera_id = camera_id
        self._slots: Dict[int, _SlotState] = {}
        self._cooldown_registry: Dict[str, float] = {}  # person_name → last_alert_time
        self._last_prune_time: float = time.monotonic()
        self._stats = TrackerStats(camera_id=camera_id)
        logger.info(
            "[TRACKER] Initialised for camera=%s  required_frames=%d  window=%.1fs  cooldown=%ds",
            camera_id, REQUIRED_FRAMES, TRACKER_WINDOW_SECONDS, ALERT_COOLDOWN_SECONDS,
        )

    # ── Public API ─────────────────────────────────────────────────────────────

    def update(
        self,
        slot_id: int,
        centroid: Tuple[float, float],
        person_name: Optional[str],
        similarity: float,
    ) -> bool:
        """
        Process a single frame detection for one face slot.

        Called once per face per frame by CameraStream.

        Args:
            slot_id     : Integer slot identifier from assign_face_slots().
            centroid    : (cx, cy) centroid of the detected face bounding box.
            person_name : Matched person name (None = NO_MATCH or UNCERTAIN).
            similarity  : Cosine similarity score from face_matcher.

        Returns:
            True if the identity is confirmed and an alert should be fired.
            False in all other cases.
        """
        self._stats.total_updates += 1
        self._maybe_prune_cooldown_registry()
        self._evict_stale_slots()

        # No valid identity — reset or initialise the slot
        if person_name is None:
            if slot_id in self._slots:
                slot = self._slots[slot_id]
                if slot.count > 0:
                    logger.debug(
                        "[TRACKER] Slot %d cam=%s: identity lost — resetting counter",
                        slot_id, self.camera_id,
                    )
                    slot.reset_run()
            return False

        # Get or create slot state
        slot = self._slots.setdefault(slot_id, _SlotState())
        slot.last_update = time.monotonic()

        # ── Identity continuity check ─────────────────────────────────────
        if slot.last_person != person_name:
            if slot.count > 0:
                logger.debug(
                    "[TRACKER] Slot %d cam=%s: identity changed '%s'→'%s' — counter reset",
                    slot_id, self.camera_id, slot.last_person, person_name,
                )
                self._stats.total_resets += 1
            slot.reset_run(person_name)

        # ── Time window check ─────────────────────────────────────────────
        if slot.time_window_exceeded():
            logger.debug(
                "[TRACKER] Slot %d cam=%s: window exceeded (%.1fs) — resetting",
                slot_id, self.camera_id, TRACKER_WINDOW_SECONDS,
            )
            slot.reset_run(person_name)

        slot.count += 1
        logger.debug(
            "[TRACKER] Slot %d cam=%s person='%s' count=%d/%d sim=%.3f",
            slot_id, self.camera_id, person_name, slot.count, REQUIRED_FRAMES, similarity,
        )

        # ── Confirmation gate ─────────────────────────────────────────────
        if slot.count < REQUIRED_FRAMES:
            return False

        # ── Cooldown check (slot-level) ───────────────────────────────────
        if slot.is_in_cooldown():
            slot.alert_suppressed_count += 1
            self._stats.total_suppressions += 1
            logger.debug(
                "[TRACKER] Slot %d cam=%s: alert suppressed by cooldown (person='%s')",
                slot_id, self.camera_id, person_name,
            )
            return False

        # ── Cooldown check (global per-person-per-camera) ─────────────────
        ck = self._cooldown_key(person_name)
        last_fired = self._cooldown_registry.get(ck, 0.0)
        if (time.monotonic() - last_fired) < ALERT_COOLDOWN_SECONDS:
            slot.alert_suppressed_count += 1
            self._stats.total_suppressions += 1
            logger.debug(
                "[TRACKER] Slot %d cam=%s: global cooldown active (person='%s')",
                slot_id, self.camera_id, person_name,
            )
            return False

        # ── FIRE ALERT ────────────────────────────────────────────────────
        now = time.monotonic()
        slot.last_alert_time = now
        slot.confirmed_count += 1
        slot.reset_run(person_name)

        self._cooldown_registry[ck] = now
        self._stats.total_alerts_fired += 1

        logger.info(
            "[TRACKER] ✔ CONFIRMED cam=%s person='%s' sim=%.3f slot=%d confirmed_total=%d",
            self.camera_id, person_name, similarity, slot_id, slot.confirmed_count,
        )
        return True

    def reset_slot(self, slot_id: int) -> None:
        """
        Manually reset a face slot's consecutive-frame counter.

        Useful when CameraStream determines a face has left the frame.
        Only the counter is cleared; the cooldown is preserved.

        Args:
            slot_id: Slot index to reset.
        """
        if slot_id in self._slots:
            self._slots[slot_id].reset_run()
            logger.debug("[TRACKER] Slot %d cam=%s manually reset", slot_id, self.camera_id)

    def get_active_slots(self) -> List[dict]:
        """
        Return a list of currently active (non-expired) slot summaries.

        Returns:
            List of dicts with keys: slot_id, person, count, confirmed_count,
            in_cooldown, last_update_ago_s.
        """
        now = time.monotonic()
        active = []
        for sid, slot in self._slots.items():
            if slot.is_expired():
                continue
            active.append({
                "slot_id":           sid,
                "person":            slot.last_person,
                "count":             slot.count,
                "confirmed_count":   slot.confirmed_count,
                "in_cooldown":       slot.is_in_cooldown(),
                "suppressed":        slot.alert_suppressed_count,
                "last_update_ago_s": round(now - slot.last_update, 2),
            })
        return active

    def get_stats(self) -> TrackerStats:
        """Return a snapshot of lifetime tracker statistics."""
        self._stats.active_slot_count = sum(
            1 for s in self._slots.values() if not s.is_expired()
        )
        self._stats.cooldown_entries = len(self._cooldown_registry)
        return self._stats

    def prune_cooldown_registry(self) -> int:
        """
        Remove expired entries from the cooldown registry.

        Should be called periodically to prevent unbounded memory growth
        in long-running deployments with many unique persons.

        Returns:
            Number of entries removed.
        """
        cutoff = time.monotonic() - ALERT_COOLDOWN_SECONDS
        expired = [k for k, v in self._cooldown_registry.items() if v < cutoff]
        for k in expired:
            del self._cooldown_registry[k]
        if expired:
            logger.debug(
                "[TRACKER] cam=%s pruned %d expired cooldown entries",
                self.camera_id, len(expired),
            )
        return len(expired)

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _evict_stale_slots(self) -> None:
        """Remove slots that have not received an update for SLOT_EXPIRY_SECONDS."""
        stale = [sid for sid, slot in self._slots.items() if slot.is_expired()]
        for sid in stale:
            logger.debug(
                "[TRACKER] Evicting stale slot=%d cam=%s person='%s'",
                sid, self.camera_id, self._slots[sid].last_person,
            )
            del self._slots[sid]  # type: ignore[misc]

    def _maybe_prune_cooldown_registry(self) -> None:
        """Prune cooldown registry at most once per COOLDOWN_PRUNE_INTERVAL seconds."""
        if (time.monotonic() - self._last_prune_time) >= COOLDOWN_PRUNE_INTERVAL:
            self.prune_cooldown_registry()
            self._last_prune_time = time.monotonic()

    def _cooldown_key(self, person_name: str) -> str:
        """Generate a stable cooldown registry key for (person, camera) pair."""
        return f"{person_name}::{self.camera_id}"

    def __repr__(self) -> str:
        stats = self.get_stats()
        return (
            f"MultiFrameTracker(cam={self.camera_id!r} "
            f"slots={stats.active_slot_count} "
            f"alerts_fired={stats.total_alerts_fired} "
            f"suppressions={stats.total_suppressions})"
        )


# ─── Centroid-based face-to-slot assignment ───────────────────────────────────

def assign_face_slots(
    bboxes: list,
    previous_centroids: Dict[int, Tuple[float, float]],
    distance_threshold: float = CENTROID_DISTANCE_THRESHOLD,
) -> Tuple[Dict[int, int], Dict[int, Tuple[float, float]]]:
    """
    Assign each detected face to the nearest existing tracking slot.

    A face is matched to an existing slot when:
        Euclidean distance between centroids < distance_threshold (default 60px).

    Unmatched faces receive new slot IDs (sequential, gap-filling).

    Args:
        bboxes             : List of [x1, y1, x2, y2] arrays for this frame.
        previous_centroids : Dict mapping existing slot_id → (cx, cy) centroid.
        distance_threshold : Maximum centroid distance for a match (pixels).

    Returns:
        face_to_slot  : Dict mapping face_index → slot_id.
        new_centroids : Dict mapping slot_id → new centroid (cx, cy).
    """
    if not bboxes:
        return {}, {}

    # Compute centroid for each detected face
    face_centroids = [
        ((b[0] + b[2]) / 2.0, (b[1] + b[3]) / 2.0) for b in bboxes
    ]

    available_slots = dict(previous_centroids)  # type: ignore[arg-type]
    face_to_slot: Dict[int, int] = {}
    used_slots: Set[int] = set()

    for fi, fc in enumerate(face_centroids):
        best_slot: Optional[int] = None
        best_dist = float("inf")

        for slot_id, sc in available_slots.items():
            if slot_id in used_slots:
                continue
            dist = float(np.hypot(fc[0] - sc[0], fc[1] - sc[1]))
            if dist < distance_threshold and dist < best_dist:
                best_dist = dist
                best_slot = slot_id

        if best_slot is not None:
            face_to_slot[fi] = best_slot  # type: ignore[assignment]
            used_slots.add(best_slot)
        else:
            # Assign the smallest unused non-negative integer as new slot ID
            new_id = 0
            existing_ids = set(available_slots.keys()) | set(face_to_slot.values())
            while new_id in existing_ids:
                new_id += 1
            face_to_slot[fi] = new_id

    new_centroids = {face_to_slot[fi]: face_centroids[fi] for fi in range(len(bboxes))}
    return face_to_slot, new_centroids