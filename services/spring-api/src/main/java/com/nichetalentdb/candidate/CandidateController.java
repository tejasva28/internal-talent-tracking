package com.nichetalentdb.candidate;

import com.nichetalentdb.candidate.dto.CandidateResponse;
import com.nichetalentdb.resume.dto.CreateCandidateRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/candidates")
public class CandidateController {
  private final CandidateService candidateService;

  public CandidateController(CandidateService candidateService) {
    this.candidateService = candidateService;
  }

  @GetMapping
  public List<CandidateResponse> list() {
    return candidateService.list().stream().map(candidateService::toResponse).toList();
  }

  @PostMapping
  public CandidateResponse create(@Valid @RequestBody CreateCandidateRequest req) {
    return candidateService.toResponse(candidateService.create(req));
  }

  @GetMapping("/{id}")
  public CandidateResponse get(@PathVariable UUID id) {
    return candidateService.toResponse(candidateService.get(id));
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable UUID id) {
    candidateService.delete(id);
  }

  @PatchMapping("/{id}/availability")
  public CandidateResponse updateAvailability(@PathVariable UUID id, @RequestParam String status) {
    return candidateService.toResponse(candidateService.updateAvailability(id, status));
  }

  @PatchMapping("/{id}/notice-period")
  public CandidateResponse updateNoticePeriod(
      @PathVariable UUID id,
      @RequestParam Boolean immediatelyAvailable,
      @RequestParam(required = false) Integer noticePeriodDays) {
    return candidateService.toResponse(candidateService.updateNoticePeriod(id, immediatelyAvailable, noticePeriodDays));
  }

  @PatchMapping("/{id}/priority")
  public CandidateResponse updatePriority(@PathVariable UUID id, @RequestParam Boolean isPriority) {
    return candidateService.toResponse(candidateService.updatePriority(id, isPriority));
  }
}
