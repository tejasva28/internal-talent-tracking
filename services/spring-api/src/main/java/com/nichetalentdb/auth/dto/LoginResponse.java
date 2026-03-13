package com.nichetalentdb.auth.dto;

public record LoginResponse(
  String accessToken,
  String tokenType
) {}
