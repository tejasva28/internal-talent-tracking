package com.nichetalentdb.search.dto;

import java.util.List;

public record SearchResponse(
        List<SearchResult> results,
        int total,
        String searchSummary // null for quick vector search; populated for RAG search
) {
}
