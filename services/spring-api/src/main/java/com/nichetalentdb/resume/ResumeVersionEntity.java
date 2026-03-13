package com.nichetalentdb.resume;

import com.nichetalentdb.common.BaseEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "resume_versions")
public class ResumeVersionEntity extends BaseEntity {

  @Column(nullable = false)
  private UUID candidateId;

  @Column(nullable = false)
  private UUID uploadedByUserId;

  @Column(nullable = false)
  private String fileKey;

  private String originalFilename;
  private String mimeType;
  private Long fileSize;

  @Column(columnDefinition = "text")
  private String parsedSnapshotJson;

  @Column(columnDefinition = "text")
  private String reviewedSnapshotJson;

  @Enumerated(EnumType.STRING)
  private ReviewStatus reviewStatus = ReviewStatus.PENDING;

  private Instant uploadedAt = Instant.now();
  private Instant reviewedAt;

  private String parserVersion;
  @Column(columnDefinition = "text")
  private String parsingConfidenceJson;

  public UUID getCandidateId() { return candidateId; }
  public void setCandidateId(UUID candidateId) { this.candidateId = candidateId; }

  public UUID getUploadedByUserId() { return uploadedByUserId; }
  public void setUploadedByUserId(UUID uploadedByUserId) { this.uploadedByUserId = uploadedByUserId; }

  public String getFileKey() { return fileKey; }
  public void setFileKey(String fileKey) { this.fileKey = fileKey; }

  public String getOriginalFilename() { return originalFilename; }
  public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }

  public String getMimeType() { return mimeType; }
  public void setMimeType(String mimeType) { this.mimeType = mimeType; }

  public Long getFileSize() { return fileSize; }
  public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

  public String getParsedSnapshotJson() { return parsedSnapshotJson; }
  public void setParsedSnapshotJson(String parsedSnapshotJson) { this.parsedSnapshotJson = parsedSnapshotJson; }

  public String getReviewedSnapshotJson() { return reviewedSnapshotJson; }
  public void setReviewedSnapshotJson(String reviewedSnapshotJson) { this.reviewedSnapshotJson = reviewedSnapshotJson; }

  public ReviewStatus getReviewStatus() { return reviewStatus; }
  public void setReviewStatus(ReviewStatus reviewStatus) { this.reviewStatus = reviewStatus; }

  public Instant getUploadedAt() { return uploadedAt; }
  public void setUploadedAt(Instant uploadedAt) { this.uploadedAt = uploadedAt; }

  public Instant getReviewedAt() { return reviewedAt; }
  public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }

  public String getParserVersion() { return parserVersion; }
  public void setParserVersion(String parserVersion) { this.parserVersion = parserVersion; }

  public String getParsingConfidenceJson() { return parsingConfidenceJson; }
  public void setParsingConfidenceJson(String parsingConfidenceJson) { this.parsingConfidenceJson = parsingConfidenceJson; }
}
