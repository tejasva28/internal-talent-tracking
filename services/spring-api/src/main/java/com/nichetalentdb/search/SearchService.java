package com.nichetalentdb.search;

import com.nichetalentdb.candidate.CandidateEntity;
import com.nichetalentdb.candidate.CandidateRepository;
import com.nichetalentdb.candidate.CandidateService;
import com.nichetalentdb.search.dto.SearchResponse;
import com.nichetalentdb.search.dto.SearchResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class SearchService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final CandidateRepository candidateRepo;
    private final CandidateService candidateService;
    private final String parserBaseUrl;

    public SearchService(
            CandidateRepository candidateRepo,
            CandidateService candidateService,
            ObjectMapper objectMapper,
            @Value("${app.parser.baseUrl}") String parserBaseUrl) {
        this.restTemplate = new RestTemplate();
        this.objectMapper = objectMapper;
        this.candidateRepo = candidateRepo;
        this.candidateService = candidateService;
        this.parserBaseUrl = parserBaseUrl;
    }

    // ── Vector-only search (fast, no LLM) ──────────────────────────────────────

    public SearchResponse quickSearch(String query, int limit) {
        Map<String, Object> payload = buildSearchPayload(query, limit);
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    parserBaseUrl + "/search", request, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            List<SearchResult> results = new ArrayList<>();
            int rank = 1;

            for (JsonNode hit : root.path("hits")) {
                String candidateId = hit.path("candidate_id").asText();
                double score = hit.path("score").asDouble();
                Optional<CandidateEntity> candidate = candidateRepo.findById(UUID.fromString(candidateId));
                if (candidate.isPresent()) {
                    results.add(new SearchResult(
                            candidateService.toResponse(candidate.get()),
                            score, rank++, null, List.of()));
                }
            }
            return new SearchResponse(results, results.size(), null);
        } catch (Exception e) {
            throw new RuntimeException("Vector search failed: " + e.getMessage(), e);
        }
    }

    // ── Full RAG search (vector + Gemini re-ranking & explanations) ─────────────

    public SearchResponse ragSearch(String query, int limit) {
        Map<String, Object> payload = buildSearchPayload(query, limit);
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    parserBaseUrl + "/rag-search", request, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String searchSummary = root.path("search_summary").asText(null);
            List<SearchResult> results = new ArrayList<>();

            List<JsonNode> ranked = new ArrayList<>();
            root.path("ranked_candidates").forEach(ranked::add);
            ranked.sort(Comparator.comparingInt(n -> n.path("rank").asInt()));

            for (JsonNode rc : ranked) {
                String candidateId = rc.path("candidate_id").asText();
                double matchScore = rc.path("match_score").asDouble();
                int rank = rc.path("rank").asInt();
                String explanation = rc.path("explanation").asText(null);
                List<String> keyStrengths = new ArrayList<>();
                rc.path("key_strengths").forEach(ks -> keyStrengths.add(ks.asText()));

                Optional<CandidateEntity> candidate = candidateRepo.findById(UUID.fromString(candidateId));
                if (candidate.isPresent()) {
                    results.add(new SearchResult(
                            candidateService.toResponse(candidate.get()),
                            matchScore, rank, explanation, keyStrengths));
                }
            }
            return new SearchResponse(results, root.path("total_retrieved").asInt(), searchSummary);
        } catch (Exception e) {
            throw new RuntimeException("RAG search failed: " + e.getMessage(), e);
        }
    }

    // ── Indexing helpers (called by ResumeService) ─────────────────────────────

    public void indexCandidate(
            String candidateId,
            String parsedSnapshotJson,
            String candidateName,
            String candidateLocation,
            Double experienceYears,
            String primarySkill) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("candidate_id", candidateId);
            payload.put("parsed_snapshot_json", objectMapper.readTree(parsedSnapshotJson));
            payload.put("candidate_name", candidateName);
            payload.put("candidate_location", candidateLocation);
            payload.put("candidate_experience_years", experienceYears);
            payload.put("candidate_primary_skill", primarySkill);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForEntity(parserBaseUrl + "/embed",
                    new HttpEntity<>(payload, headers), String.class);
        } catch (Exception e) {
            // Non-fatal — log and continue so user-facing confirm is unaffected
            System.out.println("WARN: Failed to index candidate embedding for " + candidateId + ": " + e.getMessage());
        }
    }

    public void removeIndex(String candidateId) {
        try {
            restTemplate.delete(parserBaseUrl + "/embed/" + candidateId);
        } catch (Exception e) {
            System.out.println("WARN: Failed to remove embedding for " + candidateId + ": " + e.getMessage());
        }
    }

    private Map<String, Object> buildSearchPayload(String query, int limit) {
        return Map.of("query", query, "limit", limit);
    }
}
