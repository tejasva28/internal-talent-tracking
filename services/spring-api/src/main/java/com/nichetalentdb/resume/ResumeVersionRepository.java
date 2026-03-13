package com.nichetalentdb.resume;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ResumeVersionRepository extends JpaRepository<ResumeVersionEntity, UUID> {
  List<ResumeVersionEntity> findByCandidateIdOrderByUploadedAtDesc(UUID candidateId);
}
