"""
RAG search chain using LangChain + Gemini.
Takes vector-retrieved candidates and uses an LLM to re-rank them
and generate natural language explanations for each match.
"""
import os
import logging
from typing import List, Dict, Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ── Pydantic output schemas ───────────────────────────────────────────────────

class RankedCandidate(BaseModel):
    candidate_id: str = Field(description="The candidate_id exactly as provided in the input")
    rank: int = Field(description="Rank starting from 1 (1 = best match)")
    match_score: float = Field(description="Match score from 0.0 to 10.0")
    explanation: str = Field(description="2-3 sentence explanation of why this candidate fits the query")
    key_strengths: List[str] = Field(description="3-5 key strengths or skills relevant to the query")

class RankingResult(BaseModel):
    ranked_candidates: List[RankedCandidate]
    search_summary: str = Field(description="1-2 sentence summary of the overall search results")

# ── Prompt ────────────────────────────────────────────────────────────────────

RANKING_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are an expert technical recruiter helping to rank candidates.
Given a recruiter's search query and a list of top candidate profiles retrieved via similarity search,
rank them from best to worst match.

For each candidate provide:
- A match_score from 0-10 (10 = perfect fit)
- A concise 2-3 sentence explanation of why they match (or don't)  
- Their 3-5 key strengths relevant to the query

Return ALL candidates provided — do not skip any.
Be objective. Focus on skills match, experience relevance, and seniority level."""
    ),
    (
        "human",
        """Recruiter's query: "{query}"

Candidates to rank:
{candidates_text}

Rank all {count} candidates for this query."""
    ),
])

# ── RAG Chain ─────────────────────────────────────────────────────────────────

class RAGSearchChain:
    """
    LangChain chain for re-ranking and explaining candidate matches.
    Singleton — LLM client is shared across requests.
    """

    _instance = None

    @classmethod
    def get(cls) -> "RAGSearchChain":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")

        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0.2,    # slight creativity for natural explanations
            max_retries=2,
        )
        self._chain = RANKING_PROMPT | llm.with_structured_output(RankingResult)

    def rerank(self, query: str, candidates: List[Dict[str, Any]]) -> RankingResult:
        """
        Re-rank a list of vector-retrieved candidates using the LLM.

        candidates: list of dicts with keys: candidate_id, score, payload
        """
        if not candidates:
            return RankingResult(ranked_candidates=[], search_summary="No candidates found.")

        candidates_text = _format_candidates(candidates)

        try:
            result: RankingResult = self._chain.invoke({
                "query": query,
                "candidates_text": candidates_text,
                "count": len(candidates),
            })
            return result
        except Exception as exc:
            logger.warning("LLM re-ranking failed, returning passthrough order: %s", exc)
            # Fallback: return candidates in vector similarity order without LLM explanation
            return _fallback_ranking(candidates)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _format_candidates(candidates: List[Dict[str, Any]]) -> str:
    """Format candidate data into a numbered text block for the prompt."""
    lines = []
    for i, c in enumerate(candidates, 1):
        p = c.get("payload", {})
        skills_preview = ", ".join((p.get("skills") or [])[:12])
        summary_preview = (p.get("summary") or "")[:250]

        lines.append(
            f"{i}. candidate_id: {c['candidate_id']}\n"
            f"   Name: {p.get('name', 'Unknown')}\n"
            f"   Location: {p.get('location', 'N/A')}\n"
            f"   Experience: {p.get('experience_years', 'N/A')} years\n"
            f"   Primary Skill: {p.get('primary_skill', 'N/A')}\n"
            f"   Skills: {skills_preview}\n"
            f"   Summary: {summary_preview}\n"
            f"   Vector similarity score: {c.get('score', 0):.3f}\n"
        )
    return "\n".join(lines)


def _fallback_ranking(candidates: List[Dict[str, Any]]) -> RankingResult:
    """Return candidates ranked by vector score when LLM fails."""
    ranked = [
        RankedCandidate(
            candidate_id=c["candidate_id"],
            rank=i + 1,
            match_score=round(c.get("score", 0) * 10, 1),
            explanation="Ranked by semantic similarity (LLM re-ranking unavailable).",
            key_strengths=(c.get("payload", {}).get("skills") or [])[:5],
        )
        for i, c in enumerate(candidates)
    ]
    return RankingResult(
        ranked_candidates=ranked,
        search_summary=f"Found {len(candidates)} candidates ranked by semantic similarity.",
    )
