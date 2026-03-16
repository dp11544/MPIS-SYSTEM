"""
test_ai_engine.py — Unit tests for MPIS AI engine core logic.

Tests run WITHOUT InsightFace loaded (no model required).
All AI model calls are mocked with synthetic numpy embeddings.

Run:
    cd ai-engine
    python -m pytest test_ai_engine.py -v

Or without pytest:
    python test_ai_engine.py
"""

import sys
import time
import unittest

import numpy as np  # type: ignore


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS — Synthetic embeddings
# ─────────────────────────────────────────────────────────────────────────────

def _make_emb(*values, dim: int = 512) -> np.ndarray:
    """Create a normalized 512-dim float32 vector from seed values."""
    rng = np.random.default_rng(seed=int(sum(values) * 1000))
    emb = rng.random(dim).astype(np.float32)
    emb = emb / np.linalg.norm(emb)
    return emb


def _nearly_same(emb: np.ndarray, scale: float = 0.02) -> np.ndarray:
    """Return a slightly perturbed (but still very similar) version of emb."""
    noise = np.random.default_rng(42).random(512).astype(np.float32) * scale
    v = emb + noise
    return v / np.linalg.norm(v)


def _random_emb() -> np.ndarray:
    """Return a random unit vector (unrelated embedding)."""
    v = np.random.default_rng(int(time.time() * 1e6) % 2**31).random(512).astype(np.float32)
    return v / np.linalg.norm(v)


# ─────────────────────────────────────────────────────────────────────────────
# FACE MATCHER TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestFaceMatcher(unittest.TestCase):

    def setUp(self):
        from face_matcher import FaceMatcher  # type: ignore
        self.matcher = FaceMatcher(threshold=0.65, margin=0.10)

        self.emb_durga = _make_emb(1.0, 2.0, 3.0)
        self.emb_chandu = _make_emb(7.0, 8.0, 9.0)

        self.database = [
            {
                "personId":   "P001",
                "name":       "Durga Prasad",
                "embeddings": [self.emb_durga],
            },
            {
                "personId":   "P002",
                "name":       "Chandu",
                "embeddings": [self.emb_chandu],
            },
        ]

    # ── Correct identification ────────────────────────────────────────────────

    def test_confident_match_durga(self):
        """Query nearly identical to Durga → CONFIDENT_MATCH for Durga."""
        from face_matcher import CONFIDENT_MATCH  # type: ignore
        query = _nearly_same(self.emb_durga)
        result = self.matcher.match(query, self.database)
        self.assertEqual(result.status, CONFIDENT_MATCH)
        self.assertEqual(result.person_name, "Durga Prasad")
        self.assertEqual(result.person_id, "P001")
        self.assertGreaterEqual(result.similarity, 0.65)

    def test_confident_match_chandu(self):
        """Query nearly identical to Chandu → CONFIDENT_MATCH for Chandu."""
        from face_matcher import CONFIDENT_MATCH  # type: ignore
        query = _nearly_same(self.emb_chandu)
        result = self.matcher.match(query, self.database)
        self.assertEqual(result.status, CONFIDENT_MATCH)
        self.assertEqual(result.person_name, "Chandu")
        self.assertEqual(result.person_id, "P002")

    def test_no_identity_swap(self):
        """
        CRITICAL: Chandu query must NEVER match Durga Prasad.
        Dot-product of orthogonal random 512-dim vectors is ~0.
        """
        query = _nearly_same(self.emb_chandu)
        result = self.matcher.match(query, self.database)
        if result.person_name is not None:
            self.assertNotEqual(
                result.person_name, "Durga Prasad",
                "Identity swap detected: Chandu matched as Durga!"
            )

    # ── No match ─────────────────────────────────────────────────────────────

    def test_no_match_unknown_face(self):
        """Embedding orthogonal to all DB entries → NO_MATCH.

        We construct the query as the negative unit vector of (emb_durga + emb_chandu).
        This vector is maximally dissimilar from both database embeddings —
        cosine similarity will be strongly negative, well below SIMILARITY_THRESHOLD.
        """
        from face_matcher import NO_MATCH  # type: ignore
        # Build a vector that is the antipodal of the sum of both DB embeddings.
        combined = self.emb_durga + self.emb_chandu
        antipodal = -combined / np.linalg.norm(combined)
        result = self.matcher.match(antipodal.astype(np.float32), self.database)
        self.assertEqual(result.status, NO_MATCH)
        self.assertIsNone(result.person_name)

    def test_empty_database(self):
        """Empty DB always returns NO_MATCH."""
        from face_matcher import NO_MATCH  # type: ignore
        result = self.matcher.match(self.emb_durga, [])
        self.assertEqual(result.status, NO_MATCH)

    # ── Score consistency ────────────────────────────────────────────────────

    def test_all_scores_populated(self):
        """Match result must include scores for all persons in DB."""
        query  = _nearly_same(self.emb_durga)
        result = self.matcher.match(query, self.database)
        self.assertIn("Durga Prasad", result.all_scores)
        self.assertIn("Chandu",       result.all_scores)

    def test_deterministic_result(self):
        """Same query + DB must always return the same result."""
        query = _nearly_same(self.emb_durga)
        r1 = self.matcher.match(query, self.database)
        r2 = self.matcher.match(query, self.database)
        self.assertEqual(r1.status,      r2.status)
        self.assertEqual(r1.person_name, r2.person_name)
        self.assertAlmostEqual(r1.similarity, r2.similarity, places=5)

    def test_multiple_embeddings_per_person(self):
        """Person with multiple embeddings — best-of-N score is used."""
        from face_matcher import CONFIDENT_MATCH  # type: ignore
        # Extra embedding that is very distant from query
        extra_emb = _random_emb()
        db_multi = [
            {
                "personId":   "P001",
                "name":       "Durga Prasad",
                "embeddings": [extra_emb, self.emb_durga],  # good one second
            }
        ]
        query  = _nearly_same(self.emb_durga)
        result = self.matcher.match(query, db_multi)
        self.assertEqual(result.status,      CONFIDENT_MATCH)
        self.assertEqual(result.person_name, "Durga Prasad")

    def test_invalid_embedding_input(self):
        """Wrong embedding shape → NO_MATCH (no crash)."""
        from face_matcher import NO_MATCH  # type: ignore
        bad_emb = np.array([1.0, 2.0, 3.0], dtype=np.float32)
        result  = self.matcher.match(bad_emb, self.database)
        self.assertEqual(result.status, NO_MATCH)


# ─────────────────────────────────────────────────────────────────────────────
# DATABASE LOADER TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestDatabaseLoader(unittest.TestCase):

    def setUp(self):
        from database_loader import DatabaseLoader  # type: ignore
        self.loader = DatabaseLoader()

    def test_valid_person_loaded(self):
        """Valid 512-dim embedding should be loaded successfully."""
        emb = _make_emb(1.0).tolist()
        raw = [{"personId": "P001", "name": "Alice", "embeddings": [emb]}]
        db  = self.loader._parse_records(raw)
        self.assertEqual(len(db), 1)
        self.assertEqual(db[0]["name"], "Alice")
        self.assertEqual(len(db[0]["embeddings"]), 1)
        self.assertEqual(db[0]["embeddings"][0].shape, (512,))

    def test_wrong_dimension_rejected(self):
        """Embedding with wrong dimension must be rejected."""
        emb = [0.1] * 100   # 100-dim, not 512
        raw = [{"personId": "P002", "name": "Bob", "embeddings": [emb]}]
        db  = self.loader._parse_records(raw)
        self.assertEqual(len(db), 0, "Person with invalid embedding should be excluded")

    def test_zero_norm_rejected(self):
        """Zero-norm embedding must be rejected."""
        emb = [0.0] * 512
        raw = [{"personId": "P003", "name": "Carol", "embeddings": [emb]}]
        db  = self.loader._parse_records(raw)
        self.assertEqual(len(db), 0)

    def test_missing_name_skipped(self):
        """Records without a name should be skipped."""
        emb = _make_emb(2.0).tolist()
        raw = [{"personId": "P004", "embeddings": [emb]}]
        db  = self.loader._parse_records(raw)
        self.assertEqual(len(db), 0)

    def test_mixed_valid_invalid(self):
        """Only valid embeddings extracted, invalid ones skipped per person."""
        good_emb = _make_emb(3.0).tolist()
        bad_emb  = [0.0] * 512
        raw = [{
            "personId":   "P005",
            "name":       "Dave",
            "embeddings": [bad_emb, good_emb],
        }]
        db  = self.loader._parse_records(raw)
        self.assertEqual(len(db), 1)
        self.assertEqual(len(db[0]["embeddings"]), 1)  # Only good embedding

    def test_embeddings_normalized(self):
        """Loaded embeddings must be unit vectors (L2 norm ≈ 1)."""
        emb = (_make_emb(4.0) * 5.0).tolist()   # unnormalized input
        raw = [{"personId": "P006", "name": "Eve", "embeddings": [emb]}]
        db  = self.loader._parse_records(raw)
        self.assertEqual(len(db), 1)
        norm = np.linalg.norm(db[0]["embeddings"][0])
        self.assertAlmostEqual(norm, 1.0, places=5)

    def test_thread_safe_get_snapshot(self):
        """get_snapshot() must return a copy, not the internal list."""
        snapshot = self.loader.get_snapshot()
        self.assertIsInstance(snapshot, list)
        snapshot.append({"test": True})   # modify copy
        self.assertEqual(len(self.loader.get_snapshot()), 0)   # internal unchanged


# ─────────────────────────────────────────────────────────────────────────────
# MULTI FRAME TRACKER TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestMultiFrameTracker(unittest.TestCase):

    def setUp(self):
        from multi_frame_tracker import MultiFrameTracker  # type: ignore
        self.tracker = MultiFrameTracker(camera_id="TEST_CAM")

    def test_three_frames_confirms(self):
        """Three consecutive updates for same person → True on 3rd."""
        c = (100.0, 100.0)
        r1 = self.tracker.update(0, c, "Alice", 0.82)
        r2 = self.tracker.update(0, c, "Alice", 0.84)
        r3 = self.tracker.update(0, c, "Alice", 0.85)
        self.assertFalse(r1)
        self.assertFalse(r2)
        self.assertTrue(r3)

    def test_identity_change_resets(self):
        """Identity change → counter resets, no confirmation."""
        c = (100.0, 100.0)
        self.tracker.update(0, c, "Alice", 0.82)
        self.tracker.update(0, c, "Alice", 0.83)
        r = self.tracker.update(0, c, "Bob", 0.78)   # Identity changed
        self.assertFalse(r, "Identity change should reset and NOT confirm")

    def test_two_faces_independent(self):
        """Two face slots must have independent trackers."""
        c1, c2 = (100.0, 100.0), (400.0, 200.0)

        # Drive slot 0 to 2 frames
        self.tracker.update(0, c1, "Alice", 0.82)
        self.tracker.update(0, c1, "Alice", 0.83)

        # Only 1 frame for slot 1
        r_slot1 = self.tracker.update(1, c2, "Bob", 0.79)
        self.assertFalse(r_slot1)

        # Slot 0 third frame → should confirm regardless of slot 1 state
        r_slot0 = self.tracker.update(0, c1, "Alice", 0.84)
        self.assertTrue(r_slot0)

    def test_cooldown_suppresses_repeat_alert(self):
        """After confirmation, next 3 frames within cooldown should NOT fire again."""
        c = (100.0, 100.0)
        # First confirmation
        self.tracker.update(0, c, "Alice", 0.82)
        self.tracker.update(0, c, "Alice", 0.83)
        self.tracker.update(0, c, "Alice", 0.84)   # Fires True

        # Immediately try another 3 frames — should be suppressed by cooldown
        r1 = self.tracker.update(0, c, "Alice", 0.82)
        r2 = self.tracker.update(0, c, "Alice", 0.83)
        r3 = self.tracker.update(0, c, "Alice", 0.84)
        self.assertFalse(r1 or r2 or r3, "Cooldown should suppress repeated alert")

    def test_reset_slot_clears_state(self):
        """reset_slot() must clear counter so next 3 frames start fresh."""
        c = (100.0, 100.0)
        self.tracker.update(0, c, "Alice", 0.82)
        self.tracker.update(0, c, "Alice", 0.83)
        self.tracker.reset_slot(0)
        # Now need 3 fresh frames
        r1 = self.tracker.update(0, c, "Alice", 0.82)
        r2 = self.tracker.update(0, c, "Alice", 0.83)
        self.assertFalse(r1 or r2)


# ─────────────────────────────────────────────────────────────────────────────
# FACE PREPROCESSOR TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestFacePreprocessor(unittest.TestCase):

    def _make_frame(self, h: int = 480, w: int = 640) -> np.ndarray:
        """Create a random BGR frame."""
        return np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)

    def test_valid_face_returns_rgb_image(self):
        """Valid clear face crop returns (160,160,3) RGB image."""
        from face_preprocessor import preprocess_face  # type: ignore
        frame  = self._make_frame()
        result = preprocess_face(frame, x=100, y=100, w=200, h=200)
        self.assertIsNotNone(result)
        self.assertEqual(result.shape, (160, 160, 3))
        # RGB values should be in [0, 255]
        self.assertLessEqual(result.max(), 255)
        self.assertGreaterEqual(result.min(), 0)

    def test_small_face_rejected(self):
        """Face smaller than 80x80 must return None."""
        from face_preprocessor import preprocess_face  # type: ignore
        frame  = self._make_frame()
        result = preprocess_face(frame, x=10, y=10, w=50, h=50)
        self.assertIsNone(result)

    def test_empty_frame_rejected(self):
        """Empty frame returns None."""
        from face_preprocessor import preprocess_face  # type: ignore
        result = preprocess_face(np.array([]), x=0, y=0, w=100, h=100)
        self.assertIsNone(result)

    def test_boundary_clamping(self):
        """Bounding box expansion near frame edge — must not crash or go out of bounds."""
        from face_preprocessor import preprocess_face  # type: ignore
        frame  = self._make_frame(h=200, w=200)
        # Face in corner — expansion would go negative or beyond frame
        result = preprocess_face(frame, x=0, y=0, w=100, h=100)
        if result is not None:
            self.assertEqual(result.shape, (160, 160, 3))


# ─────────────────────────────────────────────────────────────────────────────
# RUNNER
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    unittest.main(verbosity=2)
