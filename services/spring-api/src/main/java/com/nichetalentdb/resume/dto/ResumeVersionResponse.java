package com.nichetalentdb.resume.dto;

import com.nichetalentdb.resume.ReviewStatus;
import java.time.Instant;
import java.util.UUID;

public record ResumeVersionResponse(
  UUID id,
  UUID candidateId,
  String originalFilename,
  ReviewStatus reviewStatus,
  Instant uploadedAt,
  Instant reviewedAt
) {}
