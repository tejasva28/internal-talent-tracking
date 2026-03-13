package com.nichetalentdb.candidate.dto;

import com.nichetalentdb.candidate.AvailabilityStatus;
import java.time.Instant;
import java.util.UUID;

public record CandidateResponse(
    UUID id,
    String name,
    String email,
    String phone,
    String location,
    String primarySkill,
    Double experienceYears,
    AvailabilityStatus availabilityStatus,
    Instant lastResumeUpdate,
    Boolean immediatelyAvailable,
    Integer noticePeriodDays,
    Boolean isPriority) {
}
