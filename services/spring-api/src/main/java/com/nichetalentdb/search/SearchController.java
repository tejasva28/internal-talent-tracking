package com.nichetalentdb.search;

import com.nichetalentdb.search.dto.SearchResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    /**
     * Quick semantic search — only vector similarity, no LLM.
     * Very fast (~100ms). Good for live search-as-you-type.
     *
     * GET /api/search?q=Java developer&limit=10
     */
    @GetMapping
    public SearchResponse quickSearch(
            @RequestParam String q,
            @RequestParam(defaultValue = "10") int limit) {
        return searchService.quickSearch(q, Math.min(limit, 50));
    }

    /**
     * Full RAG search — vector retrieval + Gemini re-ranking + explanations.
     * Slower (~2-4s) but returns richer results with natural language explanations.
     *
     * GET /api/search/rag?q=Java developer with microservices&limit=10
     */
    @GetMapping("/rag")
    public SearchResponse ragSearch(
            @RequestParam String q,
            @RequestParam(defaultValue = "10") int limit) {
        return searchService.ragSearch(q, Math.min(limit, 50));
    }
}
