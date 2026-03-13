"""
Qdrant vector store client.
Manages the 'resumes' collection — one vector per candidate (latest confirmed resume).
Upsert semantics mean confirming a new resume automatically replaces the old vector.
"""
import os
import logging
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    Range,
)

logger = logging.getLogger(__name__)

COLLECTION_NAME = "resumes"
VECTOR_DIM = 384          # matches all-MiniLM-L6-v2


class VectorStoreClient:
    """Singleton Qdrant client — connection established once on startup."""

    _instance = None

    @classmethod
    def get(cls) -> "VectorStoreClient":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        host = os.getenv("QDRANT_HOST", "localhost")
        port = int(os.getenv("QDRANT_PORT", "6333"))
        logger.info("Connecting to Qdrant at %s:%s", host, port)
        self._client = QdrantClient(host=host, port=port)
        self._ensure_collection()

    # ── Collection management ─────────────────────────────────────────────────

    def _ensure_collection(self):
        existing = {c.name for c in self._client.get_collections().collections}
        if COLLECTION_NAME not in existing:
            self._client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
            )
            logger.info("Created Qdrant collection: %s", COLLECTION_NAME)

    # ── Write operations ──────────────────────────────────────────────────────

    def upsert(self, candidate_id: str, vector: List[float], metadata: Dict[str, Any]):
        """
        Store or replace a candidate's embedding.
        candidate_id (UUID string) is used directly as the Qdrant point ID.
        metadata is stored as the point payload for use in search result enrichment.
        """
        self._client.upsert(
            collection_name=COLLECTION_NAME,
            points=[
                PointStruct(
                    id=candidate_id,        # Qdrant supports UUID strings natively
                    vector=vector,
                    payload={"candidate_id": candidate_id, **metadata},
                )
            ],
        )
        logger.info("Upserted vector for candidate %s", candidate_id)

    def delete(self, candidate_id: str):
        """Remove a candidate's vector (called when candidate is deleted)."""
        from qdrant_client.models import PointIdsList
        self._client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=PointIdsList(points=[candidate_id]),
        )
        logger.info("Deleted vector for candidate %s", candidate_id)

    # ── Search ────────────────────────────────────────────────────────────────

    def search(
        self,
        query_vector: List[float],
        limit: int = 10,
        min_experience: Optional[float] = None,
        max_experience: Optional[float] = None,
        location: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Semantic similarity search with optional structured pre-filters.
        Pre-filtering in Qdrant happens before ANN search, so results are both
        semantically relevant AND satisfy the filters.
        """
        must_conditions = []

        if min_experience is not None or max_experience is not None:
            rng = {}
            if min_experience is not None:
                rng["gte"] = min_experience
            if max_experience is not None:
                rng["lte"] = max_experience
            must_conditions.append(
                FieldCondition(key="experience_years", range=Range(**rng))
            )

        if location:
            must_conditions.append(
                FieldCondition(
                    key="location",
                    match=MatchValue(value=location.lower()),
                )
            )

        query_filter = Filter(must=must_conditions) if must_conditions else None

        results = self._client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            limit=limit,
            query_filter=query_filter,
            with_payload=True,
        )

        return [
            {
                "candidate_id": r.payload["candidate_id"],
                "score": round(r.score, 4),
                "payload": r.payload,
            }
            for r in results
        ]
