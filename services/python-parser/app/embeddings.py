"""
Embedding service using sentence-transformers.
Converts resume text into dense vectors for semantic similarity search.
"""
import logging
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"   # 384-dim, ~80MB, fast and accurate
VECTOR_DIM = 384


class EmbeddingService:
    """Singleton embedding service — model is loaded once on first use."""

    _instance = None

    @classmethod
    def get(cls) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        logger.info("Loading embedding model: %s", MODEL_NAME)
        self._model = SentenceTransformer(MODEL_NAME)
        logger.info("Embedding model loaded.")

    def embed(self, text: str) -> List[float]:
        """Return a 384-dimensional float vector for the input text."""
        return self._model.encode(text, normalize_embeddings=True).tolist()

    def resume_to_text(self, parsed: Dict[str, Any]) -> str:
        """
        Convert a parsed resume dict into a single rich text blob used for embedding.
        The richer the text, the better the semantic search quality.
        """
        parts: List[str] = []

        basics = parsed.get("basics") or {}

        if basics.get("name"):
            parts.append(f"Candidate: {basics['name']}")

        if basics.get("location"):
            parts.append(f"Location: {basics['location']}")

        if basics.get("experience_years"):
            parts.append(f"Total experience: {basics['experience_years']} years")

        if basics.get("summary"):
            parts.append(f"Professional summary: {basics['summary']}")

        skills = parsed.get("skills") or []
        if skills:
            parts.append(f"Skills: {', '.join(skills)}")

        for exp in (parsed.get("experience") or []):
            title = exp.get("title", "")
            company = exp.get("company", "")
            start = exp.get("start", "")
            end = exp.get("end", "")
            highlights = exp.get("highlights") or []
            exp_text = f"Worked as {title} at {company} ({start} – {end})."
            if highlights:
                exp_text += " " + " ".join(highlights[:3])
            parts.append(exp_text)

        for edu in (parsed.get("education") or []):
            degree = edu.get("degree", "")
            institution = edu.get("institution", "")
            end_year = edu.get("end_year", "")
            parts.append(f"Education: {degree} from {institution} ({end_year}).")

        return "\n".join(filter(None, parts))
