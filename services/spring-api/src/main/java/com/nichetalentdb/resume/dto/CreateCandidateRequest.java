package com.nichetalentdb.resume.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCandidateRequest(
  @NotBlank String name,
  String email,
  String phone,
  String location
) {}
