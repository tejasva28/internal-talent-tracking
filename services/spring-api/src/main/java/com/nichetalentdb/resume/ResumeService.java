package com.nichetalentdb.resume;

import com.nichetalentdb.candidate.CandidateEntity;
import com.nichetalentdb.candidate.CandidateRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nichetalentdb.parser.ParserClient;
import com.nichetalentdb.search.SearchService;
import com.nichetalentdb.storage.StorageService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ResumeService {
  private final ResumeVersionRepository resumeRepo;
  private final CandidateRepository candidateRepo;
  private final StorageService storage;
  private final ParserClient parserClient;
  private final ObjectMapper objectMapper;
  private final SearchService searchService;

  public ResumeService(ResumeVersionRepository resumeRepo, CandidateRepository candidateRepo, StorageService storage,
      ParserClient parserClient, ObjectMapper objectMapper, SearchService searchService) {
    this.resumeRepo = resumeRepo;
    this.candidateRepo = candidateRepo;
    this.storage = storage;
    this.parserClient = parserClient;
    this.objectMapper = objectMapper;
    this.searchService = searchService;
  }

  public ResumeVersionEntity upload(UUID candidateId, byte[] bytes, String contentType, String filename) {
    CandidateEntity candidate = candidateRepo.findById(candidateId)
        .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

    String fileKey = storage.upload(bytes, contentType, filename);

    UUID userId = UUID.nameUUIDFromBytes(SecurityContextHolder.getContext().getAuthentication().getName().getBytes());

    var version = new ResumeVersionEntity();
    version.setCandidateId(candidate.getId());
    version.setUploadedByUserId(userId);
    version.setFileKey(fileKey);
    version.setOriginalFilename(filename);
    version.setMimeType(contentType);
    version.setFileSize((long) bytes.length);
    version.setReviewStatus(ReviewStatus.PENDING);
    version = resumeRepo.save(version);

    var parserRes = parserClient.parse(bytes, contentType, filename);
    version.setParsedSnapshotJson(parserRes.parsedSnapshotJson());
    version.setParsingConfidenceJson(parserRes.confidenceJson());
    version.setParserVersion(parserRes.parserVersion());
    return resumeRepo.save(version);
  }

  public List<ResumeVersionEntity> list(UUID candidateId) {
    return resumeRepo.findByCandidateIdOrderByUploadedAtDesc(candidateId);
  }

  public ResumeVersionEntity get(UUID versionId) {
    return resumeRepo.findById(versionId)
        .orElseThrow(() -> new IllegalArgumentException("Version not found"));
  }

  public ResumeVersionEntity confirm(UUID versionId, String reviewedSnapshotJson) {
    var v = resumeRepo.findById(versionId).orElseThrow(() -> new IllegalArgumentException("Version not found"));
    v.setReviewedSnapshotJson(reviewedSnapshotJson);
    v.setReviewStatus(ReviewStatus.CONFIRMED);
    v.setReviewedAt(Instant.now());
    v = resumeRepo.save(v);

    // Apply confirmed snapshot into candidate profile
    var c = candidateRepo.findById(v.getCandidateId()).orElseThrow();
    applyReviewedSnapshot(c, reviewedSnapshotJson);
    c.setLastResumeUpdate(Instant.now());
    candidateRepo.save(c);

    // Index embedding in Qdrant — non-blocking best-effort
    searchService.indexCandidate(
        c.getId().toString(),
        reviewedSnapshotJson,
        c.getName(),
        c.getLocation(),
        c.getExperienceYears(),
        c.getPrimarySkill());

    return v;
  }

  public ResumeVersionEntity reject(UUID versionId) {
    var v = resumeRepo.findById(versionId).orElseThrow(() -> new IllegalArgumentException("Version not found"));
    v.setReviewStatus(ReviewStatus.REJECTED);
    v.setReviewedAt(Instant.now());
    return resumeRepo.save(v);
  }

  public void deleteVersion(UUID versionId) {
    var v = resumeRepo.findById(versionId).orElseThrow(() -> new IllegalArgumentException("Version not found"));
    // Remove vector from Qdrant
    searchService.removeIndex(v.getCandidateId().toString());
    // Delete file from MinIO
    storage.delete(v.getFileKey());
    // Delete record from database
    resumeRepo.deleteById(versionId);
  }

  public ResponseEntity<byte[]> download(UUID versionId) {
    var v = resumeRepo.findById(versionId).orElseThrow(() -> new IllegalArgumentException("Version not found"));
    byte[] fileBytes = storage.download(v.getFileKey());

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(
        MediaType.parseMediaType(v.getMimeType() != null ? v.getMimeType() : "application/octet-stream"));
    headers.setContentDispositionFormData("attachment", v.getOriginalFilename());
    headers.setContentLength(fileBytes.length);

    return ResponseEntity.ok()
        .headers(headers)
        .body(fileBytes);
  }

  private void applyReviewedSnapshot(CandidateEntity candidate, String reviewedSnapshotJson) {
    if (reviewedSnapshotJson == null || reviewedSnapshotJson.isBlank()) {
      return;
    }
    try {
      JsonNode root = objectMapper.readTree(reviewedSnapshotJson);
      JsonNode basics = root.path("basics");
      JsonNode skills = root.path("skills");
      JsonNode education = root.path("education");
      JsonNode experience = root.path("experience");

      String name = textOrNull(basics.path("name"));
      if (!isBlank(name)) {
        candidate.setName(name);
      }

      String email = textOrNull(basics.path("email"));
      if (!isBlank(email)
          && candidateRepo.findByEmail(email).map(ent -> ent.getId().equals(candidate.getId())).orElse(true)) {
        candidate.setEmail(email);
      }

      String phone = textOrNull(basics.path("phone"));
      if (!isBlank(phone)
          && candidateRepo.findByPhone(phone).map(ent -> ent.getId().equals(candidate.getId())).orElse(true)) {
        candidate.setPhone(phone);
      }

      String location = textOrNull(basics.path("location"));
      if (!isBlank(location)) {
        candidate.setLocation(location);
      }

      JsonNode experienceYears = basics.path("experience_years");
      if (experienceYears != null && experienceYears.isNumber()) {
        candidate.setExperienceYears(experienceYears.asDouble());
      }

      if (skills.isArray() && !skills.isEmpty()) {
        candidate.setSkillsJson(skills.toString());
        String firstSkill = textOrNull(skills.path(0));
        if (!isBlank(firstSkill)) {
          candidate.setPrimarySkill(firstSkill);
        }
      }
      if (education.isArray()) {
        candidate.setEducationJson(education.toString());
      }
      if (experience.isArray()) {
        candidate.setWorkExperienceJson(experience.toString());
      }
    } catch (Exception ignored) {
      // Keep review confirmation resilient even if parser JSON is malformed.
    }
  }

  private String textOrNull(JsonNode node) {
    if (node == null || node.isMissingNode() || node.isNull())
      return null;
    String value = node.asText();
    return isBlank(value) ? null : value;
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
