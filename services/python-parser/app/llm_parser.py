"""
LLM-powered resume parser using LangChain + Gemini.
Replaces the regex-based parsing with structured LLM extraction
for significantly better accuracy on varied resume formats.
"""
import os
import logging
from typing import List, Optional, Dict, Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ── Pydantic schemas for structured LLM output ───────────────────────────────

class BasicInfo(BaseModel):
    name: Optional[str] = Field(None, description="Full name of the candidate")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    location: Optional[str] = Field(None, description="City, state, or country where the candidate is based")
    linkedin_url: Optional[str] = Field(None, description="LinkedIn profile URL if present")
    portfolio_url: Optional[str] = Field(None, description="GitHub, portfolio, or personal website URL if present")
    summary: Optional[str] = Field(None, description="Professional summary or objective statement (2-4 sentences)")
    experience_years: Optional[float] = Field(None, description="Total years of professional work experience")

class EducationItem(BaseModel):
    degree: Optional[str] = Field(None, description="Degree name (e.g., B.Tech, M.Sc, MBA)")
    institution: Optional[str] = Field(None, description="Name of the university or college")
    start_year: Optional[int] = Field(None, description="Year of enrollment")
    end_year: Optional[int] = Field(None, description="Year of graduation or expected graduation")
    gpa: Optional[str] = Field(None, description="GPA or percentage if mentioned")

class ExperienceItem(BaseModel):
    title: Optional[str] = Field(None, description="Job title or position")
    company: Optional[str] = Field(None, description="Company or organisation name")
    start: Optional[str] = Field(None, description="Start date (e.g., 'Jan 2021' or '2021')")
    end: Optional[str] = Field(None, description="End date or 'Present'")
    location: Optional[str] = Field(None, description="Work location if mentioned")
    highlights: List[str] = Field(default_factory=list, description="Key achievements or responsibilities as bullet points")

class ParsedResume(BaseModel):
    basics: BasicInfo = Field(default_factory=BasicInfo)
    skills: List[str] = Field(default_factory=list, description="All technical and soft skills mentioned in the resume")
    education: List[EducationItem] = Field(default_factory=list)
    experience: List[ExperienceItem] = Field(default_factory=list)

# ── Prompt ────────────────────────────────────────────────────────────────────

PARSE_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are an expert resume parser. Extract ALL structured information from the resume text.

Guidelines:
- Extract EVERY technical skill, framework, tool, and language mentioned anywhere in the resume
- For experience_years, calculate total professional work experience by summing job durations (exclude internships from total if less than 6 months)
- For the summary, synthesise a 2-4 sentence professional summary if one isn't already present
- Keep highlights as concise, action-oriented bullet points (max 4 per job)
- Extract LinkedIn URLs, GitHub/portfolio URLs if visible
- If a field is not present in the resume, leave it as null — do NOT invent data
- skills list should be deduplicated and normalised (e.g. 'ReactJS' → 'React')"""
    ),
    ("human", "Parse this resume and extract all structured information:\n\n{resume_text}"),
])

# ── Parser class ──────────────────────────────────────────────────────────────

class LLMResumeParser:
    """
    Uses Gemini 1.5 Flash via LangChain to parse resumes into
    structured JSON with much higher accuracy than regex-based approaches.
    """

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY environment variable is not set")

        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0,          # deterministic — we want consistent extraction
            max_retries=2,
        )
        # .with_structured_output() instructs Gemini to conform to our Pydantic schema
        self._chain = PARSE_PROMPT | llm.with_structured_output(ParsedResume)

    def parse(self, resume_text: str) -> Dict[str, Any]:
        """
        Parse raw resume text and return a dict matching the existing ParseResponse shape.
        Falls back gracefully on failure so resume upload never crashes.
        """
        if not resume_text or not resume_text.strip():
            return _empty_result()

        try:
            result: ParsedResume = self._chain.invoke({"resume_text": resume_text[:12000]})  # cap context
            return _to_response_dict(result)
        except Exception as exc:
            logger.warning("LLM parsing failed, returning empty result: %s", exc)
            return _empty_result()

# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_response_dict(parsed: ParsedResume) -> Dict[str, Any]:
    """Convert the Pydantic model back to the dict shape expected by the API."""
    basics_dict: Dict[str, Any] = {
        "name": parsed.basics.name,
        "email": parsed.basics.email,
        "phone": parsed.basics.phone,
        "location": parsed.basics.location,
        "linkedin_url": parsed.basics.linkedin_url,
        "portfolio_url": parsed.basics.portfolio_url,
        "summary": parsed.basics.summary,
    }
    if parsed.basics.experience_years is not None:
        basics_dict["experience_years"] = parsed.basics.experience_years

    education = [
        {
            "degree": e.degree,
            "institution": e.institution,
            "start_year": e.start_year,
            "end_year": e.end_year,
            "gpa": e.gpa,
        }
        for e in parsed.education
    ]

    experience = [
        {
            "title": e.title,
            "company": e.company,
            "start": e.start,
            "end": e.end,
            "location": e.location,
            "highlights": e.highlights,
        }
        for e in parsed.experience
    ]

    return {
        "basics": basics_dict,
        "skills": parsed.skills,
        "education": education,
        "experience": experience,
        "confidence": {
            # LLM extraction is high confidence by nature
            "basics": 0.95 if basics_dict.get("email") or basics_dict.get("phone") else 0.7,
            "skills": 0.9 if parsed.skills else 0.4,
            "education": 0.9 if parsed.education else 0.4,
            "experience": 0.9 if parsed.experience else 0.4,
        },
        "parser_version": "v2-gemini-langchain",
    }


def _empty_result() -> Dict[str, Any]:
    return {
        "basics": {"email": None, "phone": None, "name": None, "location": None},
        "skills": [],
        "education": [],
        "experience": [],
        "confidence": {"basics": 0.0, "skills": 0.0, "education": 0.0, "experience": 0.0},
        "parser_version": "v2-gemini-langchain",
    }
