package com.nichetalentdb.resume.dto;

import jakarta.validation.constraints.NotBlank;

public record ConfirmReviewRequest(
  @NotBlank String reviewedSnapshotJson
) {}
