package com.nichetalentdb.search.dto;

import com.nichetalentdb.candidate.dto.CandidateResponse;
import java.util.List;

/**
 * Represents a single result from the RAG search endpoint.
 * Combines the full candidate profile with the LLM-generated explanation.
 */
public record SearchResult(
        CandidateResponse candidate,
        double score,
        int rank,
        String explanation,
        List<String> keyStrengths) {
}
