package com.nichetalentdb.resume;

import com.nichetalentdb.resume.dto.ConfirmReviewRequest;
import com.nichetalentdb.resume.dto.ResumeVersionResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ResumeController {
  private final ResumeService resumeService;

  public ResumeController(ResumeService resumeService) {
    this.resumeService = resumeService;
  }

  @PostMapping(value = "/candidates/{candidateId}/resumes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResumeVersionEntity upload(@PathVariable UUID candidateId, @RequestPart("file") MultipartFile file)
      throws IOException {
    return resumeService.upload(candidateId, file.getBytes(), file.getContentType(), file.getOriginalFilename());
  }

  @GetMapping("/candidates/{candidateId}/resume-versions")
  public List<ResumeVersionResponse> versions(@PathVariable UUID candidateId) {
    return resumeService.list(candidateId).stream()
        .map(v -> new ResumeVersionResponse(v.getId(), v.getCandidateId(), v.getOriginalFilename(), v.getReviewStatus(),
            v.getUploadedAt(), v.getReviewedAt()))
        .toList();
  }

  @GetMapping("/resume-versions/{versionId}")
  public ResumeVersionEntity getVersion(@PathVariable UUID versionId) {
    return resumeService.get(versionId);
  }

  @PostMapping("/resume-versions/{versionId}/confirm")
  public ResumeVersionEntity confirm(@PathVariable UUID versionId, @Valid @RequestBody ConfirmReviewRequest req) {
    return resumeService.confirm(versionId, req.reviewedSnapshotJson());
  }

  @PostMapping("/resume-versions/{versionId}/reject")
  public ResumeVersionEntity reject(@PathVariable UUID versionId) {
    return resumeService.reject(versionId);
  }

  @DeleteMapping("/resume-versions/{versionId}")
  public void deleteVersion(@PathVariable UUID versionId) {
    resumeService.deleteVersion(versionId);
  }

  @GetMapping("/resume-versions/{versionId}/download")
  public ResponseEntity<byte[]> download(@PathVariable UUID versionId) {
    return resumeService.download(versionId);
  }
}
