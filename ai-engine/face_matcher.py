import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np  # type: ignore

from config import CONFIDENT_THRESHOLD, REVIEW_THRESHOLD, UNCERTAINTY_MARGIN, EMBEDDING_DIM  # type: ignore

logger = logging.getLogger(__name__)

CONFIDENT_MATCH = "CONFIDENT_MATCH"
REVIEW_MATCH = "REVIEW_MATCH"
UNCERTAIN_MATCH = "UNCERTAIN_MATCH"
NO_MATCH = "NO_MATCH"


@dataclass
class MatchResult:
    status: str
    person_id: Optional[str]
    person_name: Optional[str]
    similarity: float
    gap: float
    second_name: Optional[str]
    rank_table: List[Tuple[str, str, float]]
    all_scores: Dict[str, float]
    latency_ms: float

    @property
    def is_confident(self) -> bool:
        return self.status == CONFIDENT_MATCH

    def explain(self) -> str:

        if self.status == CONFIDENT_MATCH:
            return (
                f"CONFIDENT_MATCH: '{self.person_name}' (id={self.person_id}) "
                f"score={self.similarity:.4f}  gap={self.gap:.4f}  "
                f"latency={self.latency_ms:.1f}ms"
            )

        if self.status == REVIEW_MATCH:
            return (
                f"REVIEW_MATCH: '{self.person_name}' (id={self.person_id}) "
                f"score={self.similarity:.4f} gap={self.gap:.4f} "
                f"latency={self.latency_ms:.1f}ms"
            )

        if self.status == UNCERTAIN_MATCH:
            return (
                f"UNCERTAIN_MATCH: best='{self.person_name}' score={self.similarity:.4f} "
                f"gap={self.gap:.4f} < margin={UNCERTAINTY_MARGIN} "
                f"second='{self.second_name}' latency={self.latency_ms:.1f}ms"
            )

        return (
            f"NO_MATCH: best_score={self.similarity:.4f} "
            f"< review_threshold={REVIEW_THRESHOLD} latency={self.latency_ms:.1f}ms"
        )


class FaceMatcher:

    def __init__(
        self,
        margin: float = UNCERTAINTY_MARGIN,
    ) -> None:

        self.confident_threshold = CONFIDENT_THRESHOLD
        self.review_threshold = REVIEW_THRESHOLD
        self.margin = margin

        self._match_count = 0
        self._total_latency_ms = 0.0

        logger.info(
            "[FACE MATCHER] Initialised (confident=%.2f review=%.2f margin=%.2f)",
            self.confident_threshold,
            self.review_threshold,
            self.margin,
        )

    # ----------------------------------------------------------

    def match(
        self,
        embedding: np.ndarray,
        database: List[Dict[str, Any]],
    ) -> MatchResult:

        t0 = time.monotonic()

        # ------------------------------------------------------
        # VALIDATE + NORMALIZE QUERY EMBEDDING
        # ------------------------------------------------------

        if not isinstance(embedding, np.ndarray) or embedding.shape != (EMBEDDING_DIM,):
            logger.warning(
                "[FACE MATCHER] Invalid query embedding shape=%s",
                getattr(embedding, "shape", "N/A"),
            )
            return self._no_match()

        if not np.all(np.isfinite(embedding)):
            logger.warning("[FACE MATCHER] Query embedding contains NaN/Inf")
            return self._no_match()

        norm = np.linalg.norm(embedding)
        if norm == 0 or not np.isfinite(norm):
            logger.warning("[FACE MATCHER] Query embedding norm invalid")
            return self._no_match()

        embedding = embedding / norm

        # ------------------------------------------------------

        if not database:
            logger.warning("[FACE MATCHER] Empty database")
            return self._no_match()

        scores: List[Tuple[str, str, float]] = []

        # ------------------------------------------------------
        # CORE MATCH LOOP
        # ------------------------------------------------------

        for person in database:

            pid = person.get("personId", "")
            name = person.get("name", "")
            emb_list = person.get("embeddings", [])

            if not emb_list:
                continue

            best_score = -1.0

            for stored_emb in emb_list:

                if not isinstance(stored_emb, np.ndarray):
                    continue

                if stored_emb.shape != (EMBEDDING_DIM,):
                    continue

                if not np.all(np.isfinite(stored_emb)):
                    continue

                norm = np.linalg.norm(stored_emb)
                if norm == 0 or not np.isfinite(norm):
                    continue

                stored_emb = stored_emb / norm

                score = float(np.dot(embedding, stored_emb))

                logger.info("[SIMILARITY] %s = %.4f", name, score)

                if score > best_score:
                    best_score = score

            if best_score >= 0:
                scores.append((pid, name, best_score))

        # ------------------------------------------------------

        if not scores:
            logger.warning("[FACE MATCHER] No valid scores computed")
            return self._no_match()

        # Sort by highest similarity
        scores.sort(key=lambda t: (-t[2], t[1]))

        top_id, top_name, top_score = scores[0]

        sec_name = scores[1][1] if len(scores) > 1 else None
        sec_score = scores[1][2] if len(scores) > 1 else 0.0

        gap = top_score - sec_score

        all_scores = {name: round(score, 4) for _, name, score in scores}

        latency_ms = (time.monotonic() - t0) * 1000.0

        self._match_count += 1
        self._total_latency_ms += latency_ms

        # ------------------------------------------------------
        # DECISION LOGIC
        # ------------------------------------------------------

        if top_score < self.review_threshold:
            logger.info(f"[FACE MATCHER] NO MATCH (score={top_score:.4f} < {self.review_threshold})")
            return MatchResult(
                status=NO_MATCH,
                person_id=None,
                person_name=None,
                similarity=round(top_score, 4),
                gap=round(gap, 4),
                second_name=sec_name,
                rank_table=scores,
                all_scores=all_scores,
                latency_ms=round(latency_ms, 2),
            )

        if gap < self.margin:
            logger.info(f"[FACE MATCHER] UNCERTAIN MATCH ({top_name} vs {sec_name}) gap={gap:.4f}")
            return MatchResult(
                status=UNCERTAIN_MATCH,
                person_id=top_id,
                person_name=top_name,
                similarity=round(top_score, 4),
                gap=round(gap, 4),
                second_name=sec_name,
                rank_table=scores,
                all_scores=all_scores,
                latency_ms=round(latency_ms, 2),
            )

        # Apply Adaptive Logic
        status = CONFIDENT_MATCH if top_score >= self.confident_threshold else REVIEW_MATCH
        
        result = MatchResult(
            status=status,
            person_id=top_id,
            person_name=top_name,
            similarity=round(top_score, 4),
            gap=round(gap, 4),
            second_name=sec_name,
            rank_table=scores,
            all_scores=all_scores,
            latency_ms=round(latency_ms, 2),
        )



        logger.info("[FACE MATCHER] %s", result.explain())

        return result

    # ----------------------------------------------------------

    @staticmethod
    def _no_match() -> MatchResult:

        return MatchResult(
            status=NO_MATCH,
            person_id=None,
            person_name=None,
            similarity=0.0,
            gap=0.0,
            second_name=None,
            rank_table=[],
            all_scores={},
            latency_ms=0.0,
        )

    # ----------------------------------------------------------

    def get_metrics(self):

        avg_latency = (
            self._total_latency_ms / self._match_count
            if self._match_count > 0 else 0
        )

        return {
            "match_count": self._match_count,
            "avg_latency_ms": round(avg_latency, 2),
            "confident_threshold": self.confident_threshold,
            "review_threshold": self.review_threshold,
            "margin": self.margin,
        }