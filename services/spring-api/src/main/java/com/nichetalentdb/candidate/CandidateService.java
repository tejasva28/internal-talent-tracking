package com.nichetalentdb.candidate;

import com.nichetalentdb.candidate.dto.CandidateResponse;
import com.nichetalentdb.common.DuplicateValueException;
import com.nichetalentdb.resume.dto.CreateCandidateRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class CandidateService {
  private final CandidateRepository candidateRepository;

  public CandidateService(CandidateRepository candidateRepository) {
    this.candidateRepository = candidateRepository;
  }

  public CandidateEntity create(CreateCandidateRequest req) {
    String email = normalize(req.email());
    String phone = normalize(req.phone());

    if (email != null && candidateRepository.findByEmail(email).isPresent()) {
      throw new DuplicateValueException("A candidate with this email already exists");
    }
    if (phone != null && candidateRepository.findByPhone(phone).isPresent()) {
      throw new DuplicateValueException("A candidate with this phone already exists");
    }

    var c = new CandidateEntity();
    c.setName(req.name());
    c.setEmail(email);
    c.setPhone(phone);
    c.setLocation(normalize(req.location()));
    return candidateRepository.save(c);
  }

  public CandidateEntity get(UUID id) {
    return candidateRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Candidate not found"));
  }

  public List<CandidateEntity> list() {
    return candidateRepository.findAll();
  }

  public CandidateResponse toResponse(CandidateEntity c) {
    return new CandidateResponse(
        c.getId(), c.getName(), c.getEmail(), c.getPhone(), c.getLocation(),
        c.getPrimarySkill(), c.getExperienceYears(), c.getAvailabilityStatus(), c.getLastResumeUpdate(),
        c.getImmediatelyAvailable(), c.getNoticePeriodDays(), c.getIsPriority());
  }

  public void delete(UUID id) {
    candidateRepository.deleteById(id);
  }

  public CandidateEntity updateAvailability(UUID id, String status) {
    var candidate = get(id);
    try {
      AvailabilityStatus availabilityStatus = AvailabilityStatus.valueOf(status.toUpperCase());
      candidate.setAvailabilityStatus(availabilityStatus);
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("Invalid availability status: " + status);
    }
    return candidateRepository.save(candidate);
  }

  public CandidateEntity updateNoticePeriod(UUID id, Boolean immediatelyAvailable, Integer noticePeriodDays) {
    var candidate = get(id);
    candidate.setImmediatelyAvailable(immediatelyAvailable);
    candidate.setNoticePeriodDays(immediatelyAvailable ? null : noticePeriodDays);
    return candidateRepository.save(candidate);
  }

  public CandidateEntity updatePriority(UUID id, Boolean isPriority) {
    var candidate = get(id);
    candidate.setIsPriority(isPriority);
    return candidateRepository.save(candidate);
  }

  private String normalize(String value) {
    if (value == null)
      return null;
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
