"""
Internal Database Tracking System Parser Service — v2 (LLM-powered)

Endpoints:
  POST /parse          — LLM-powered resume parsing (PDF/DOCX/text)
  POST /embed          — Generate embedding and store in Qdrant
  DELETE /embed/{id}   — Remove a candidate's vector from Qdrant
  POST /search         — Semantic vector search
  POST /rag-search     — Full RAG: vector search + Gemini re-ranking + explanations
  POST /reindex        — Re-index a candidate given already-parsed JSON (admin)
  GET  /health         — Health check
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import base64
import logging
import os
from io import BytesIO

from pdfminer.high_level import extract_text as pdf_extract_text
from docx import Document

from app.llm_parser import LLMResumeParser
from app.embeddings import EmbeddingService
from app.vector_store import VectorStoreClient
from app.rag_chain import RAGSearchChain

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Internal Database Tracking System Parser", version="2.0.0")

# ── Lazy-initialise singletons ────────────────────────────────────────────────
# Singletons are initialised on first request so FastAPI startup is not blocked.

def get_parser() -> LLMResumeParser:
    if not hasattr(app.state, "parser"):
        app.state.parser = LLMResumeParser()
    return app.state.parser

def get_embedder() -> EmbeddingService:
    if not hasattr(app.state, "embedder"):
        app.state.embedder = EmbeddingService.get()
    return app.state.embedder

def get_vector_store() -> VectorStoreClient:
    if not hasattr(app.state, "vector_store"):
        app.state.vector_store = VectorStoreClient.get()
    return app.state.vector_store

def get_rag_chain() -> RAGSearchChain:
    if not hasattr(app.state, "rag_chain"):
        app.state.rag_chain = RAGSearchChain.get()
    return app.state.rag_chain

# ── Request / Response models ─────────────────────────────────────────────────

class ParseRequest(BaseModel):
    file_base64: Optional[str] = None
    content_type: Optional[str] = None
    file_url: Optional[str] = None
    raw_text: Optional[str] = None
    filename: Optional[str] = None

class EmbedRequest(BaseModel):
    candidate_id: str = Field(..., description="UUID of the candidate (used as Qdrant point ID)")
    parsed_snapshot_json: Dict[str, Any] = Field(..., description="The reviewed/parsed resume JSON")
    # Extra candidate metadata to store in the payload for search result display
    candidate_name: Optional[str] = None
    candidate_location: Optional[str] = None
    candidate_experience_years: Optional[float] = None
    candidate_primary_skill: Optional[str] = None

class SearchRequest(BaseModel):
    query: str = Field(..., description="Natural language search query")
    limit: int = Field(10, ge=1, le=50)
    min_experience: Optional[float] = None
    max_experience: Optional[float] = None
    location: Optional[str] = None

class SearchHit(BaseModel):
    candidate_id: str
    score: float
    payload: Dict[str, Any]

class SearchResponse(BaseModel):
    hits: List[SearchHit]
    total: int

class RankedCandidateOut(BaseModel):
    candidate_id: str
    rank: int
    match_score: float
    explanation: str
    key_strengths: List[str]

class RAGSearchResponse(BaseModel):
    ranked_candidates: List[RankedCandidateOut]
    search_summary: str
    total_retrieved: int

class ReindexRequest(BaseModel):
    candidate_id: str
    parsed_snapshot_json: Dict[str, Any]
    candidate_name: Optional[str] = None
    candidate_location: Optional[str] = None
    candidate_experience_years: Optional[float] = None
    candidate_primary_skill: Optional[str] = None

# ── Utility: text extraction ──────────────────────────────────────────────────

def _extract_text(data: bytes, content_type: str, filename: Optional[str]) -> str:
    fname = (filename or "").lower()
    ctype = (content_type or "").lower()

    if "application/pdf" in ctype or fname.endswith(".pdf"):
        try:
            return pdf_extract_text(BytesIO(data))
        except Exception:
            return ""

    if (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in ctype
        or fname.endswith(".docx")
    ):
        try:
            doc = Document(BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            return ""

    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("latin-1", errors="ignore")

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/parse")
def parse(req: ParseRequest) -> Dict[str, Any]:
    """
    Parse a resume using Gemini LLM and return structured JSON.
    Accepts file_base64, file_url, or raw_text.
    """
    if not req.raw_text and not req.file_url and not req.file_base64:
        return _empty_parse_response()

    # Extract raw text from the file
    if req.raw_text:
        text = req.raw_text
    elif req.file_base64:
        try:
            data = base64.b64decode(req.file_base64)
            text = _extract_text(data, req.content_type or "", req.filename)
        except Exception:
            text = ""
    else:
        import requests as req_lib
        r = req_lib.get(req.file_url, timeout=30)
        r.raise_for_status()
        text = _extract_text(r.content, r.headers.get("content-type", ""), req.filename)

    logger.info("Extracted %d characters from resume, sending to LLM parser", len(text))
    return get_parser().parse(text)


@app.post("/embed")
def embed(req: EmbedRequest):
    """
    Generate a semantic embedding for the parsed resume and store it in Qdrant.
    Called by the Spring API when a resume review is confirmed.
    Upserting means a new confirmed resume replaces the previous vector automatically.
    """
    embedder = get_embedder()
    vector_store = get_vector_store()

    # Build rich text blob for embedding
    resume_text = embedder.resume_to_text(req.parsed_snapshot_json)
    vector = embedder.embed(resume_text)

    # Build metadata payload stored alongside the vector in Qdrant
    parsed_basics = req.parsed_snapshot_json.get("basics") or {}
    metadata = {
        "name": req.candidate_name or parsed_basics.get("name"),
        "location": (req.candidate_location or parsed_basics.get("location") or "").lower(),
        "experience_years": req.candidate_experience_years or parsed_basics.get("experience_years"),
        "primary_skill": req.candidate_primary_skill,
        "skills": req.parsed_snapshot_json.get("skills") or [],
        "summary": parsed_basics.get("summary"),
        "resume_text_snippet": resume_text[:500],
    }

    vector_store.upsert(req.candidate_id, vector, metadata)
    return {"ok": True, "candidate_id": req.candidate_id, "vector_dim": len(vector)}


@app.delete("/embed/{candidate_id}")
def remove_embedding(candidate_id: str):
    """Remove a candidate's vector from Qdrant (called on candidate deletion)."""
    try:
        get_vector_store().delete(candidate_id)
        return {"ok": True}
    except Exception as e:
        logger.warning("Failed to delete vector for %s: %s", candidate_id, e)
        return {"ok": False, "error": str(e)}


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest):
    """
    Perform semantic vector search — fast, no LLM involved.
    Returns top-K candidates ranked by embedding similarity.
    """
    embedder = get_embedder()
    vector_store = get_vector_store()

    query_vector = embedder.embed(req.query)
    hits = vector_store.search(
        query_vector=query_vector,
        limit=req.limit,
        min_experience=req.min_experience,
        max_experience=req.max_experience,
        location=req.location,
    )
    return SearchResponse(hits=[SearchHit(**h) for h in hits], total=len(hits))


@app.post("/rag-search", response_model=RAGSearchResponse)
def rag_search(req: SearchRequest):
    """
    Full RAG pipeline:
    1. Embed the query
    2. Retrieve top-K candidates from Qdrant
    3. Send candidates + query to Gemini for re-ranking and explanation generation
    4. Return ranked results with natural language explanations
    """
    embedder = get_embedder()
    vector_store = get_vector_store()
    rag = get_rag_chain()

    # Step 1 & 2 — Retrieve
    query_vector = embedder.embed(req.query)
    hits = vector_store.search(
        query_vector=query_vector,
        limit=req.limit,
        min_experience=req.min_experience,
        max_experience=req.max_experience,
        location=req.location,
    )

    if not hits:
        return RAGSearchResponse(
            ranked_candidates=[],
            search_summary="No candidates found matching your query.",
            total_retrieved=0,
        )

    # Step 3 — Re-rank with Gemini
    ranking = rag.rerank(req.query, hits)

    # Step 4 — Return
    return RAGSearchResponse(
        ranked_candidates=[
            RankedCandidateOut(
                candidate_id=rc.candidate_id,
                rank=rc.rank,
                match_score=rc.match_score,
                explanation=rc.explanation,
                key_strengths=rc.key_strengths,
            )
            for rc in ranking.ranked_candidates
        ],
        search_summary=ranking.search_summary,
        total_retrieved=len(hits),
    )


@app.post("/reindex")
def reindex(req: ReindexRequest):
    """
    Admin endpoint: re-index an existing candidate without needing to re-upload.
    Useful for backfilling vectors for resumes that were confirmed before RAG was added.
    """
    return embed(
        EmbedRequest(
            candidate_id=req.candidate_id,
            parsed_snapshot_json=req.parsed_snapshot_json,
            candidate_name=req.candidate_name,
            candidate_location=req.candidate_location,
            candidate_experience_years=req.candidate_experience_years,
            candidate_primary_skill=req.candidate_primary_skill,
        )
    )


@app.get("/health")
def health():
    return {"ok": True, "version": "2.0.0-gemini-rag"}


def _empty_parse_response() -> Dict[str, Any]:
    return {
        "basics": {"email": None, "phone": None, "name": None, "location": None},
        "skills": [],
        "education": [],
        "experience": [],
        "confidence": {"basics": 0.0, "skills": 0.0, "education": 0.0, "experience": 0.0},
        "parser_version": "v2-gemini-langchain",
    }
