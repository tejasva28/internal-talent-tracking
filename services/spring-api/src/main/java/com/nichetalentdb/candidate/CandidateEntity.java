package com.nichetalentdb.candidate;

import com.nichetalentdb.common.BaseEntity;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "candidates", indexes = {
    @Index(name = "idx_candidates_email", columnList = "email"),
    @Index(name = "idx_candidates_phone", columnList = "phone")
})
public class CandidateEntity extends BaseEntity {

  @Column(nullable = false)
  private String name;

  @Column(unique = true)
  private String email;

  @Column(unique = true)
  private String phone;

  private String location;
  private String primarySkill;
  private Double experienceYears;

  @Enumerated(EnumType.STRING)
  private AvailabilityStatus availabilityStatus = AvailabilityStatus.UNKNOWN;

  private Instant lastResumeUpdate;

  // JSON stored as text for MVP (works with Postgres). Later switch to JSONB
  // mapping.
  @Column(columnDefinition = "text")
  private String skillsJson = "[]";

  @Column(columnDefinition = "text")
  private String educationJson = "[]";

  @Column(columnDefinition = "text")
  private String workExperienceJson = "[]";

  private Boolean immediatelyAvailable = false;
  private Integer noticePeriodDays; // Notice period in days if not immediately available
  private Boolean isPriority = false; // Flag to mark priority candidates

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getLocation() {
    return location;
  }

  public void setLocation(String location) {
    this.location = location;
  }

  public String getPrimarySkill() {
    return primarySkill;
  }

  public void setPrimarySkill(String primarySkill) {
    this.primarySkill = primarySkill;
  }

  public Double getExperienceYears() {
    return experienceYears;
  }

  public void setExperienceYears(Double experienceYears) {
    this.experienceYears = experienceYears;
  }

  public AvailabilityStatus getAvailabilityStatus() {
    return availabilityStatus;
  }

  public void setAvailabilityStatus(AvailabilityStatus availabilityStatus) {
    this.availabilityStatus = availabilityStatus;
  }

  public Instant getLastResumeUpdate() {
    return lastResumeUpdate;
  }

  public void setLastResumeUpdate(Instant lastResumeUpdate) {
    this.lastResumeUpdate = lastResumeUpdate;
  }

  public String getSkillsJson() {
    return skillsJson;
  }

  public void setSkillsJson(String skillsJson) {
    this.skillsJson = skillsJson;
  }

  public String getEducationJson() {
    return educationJson;
  }

  public void setEducationJson(String educationJson) {
    this.educationJson = educationJson;
  }

  public String getWorkExperienceJson() {
    return workExperienceJson;
  }

  public void setWorkExperienceJson(String workExperienceJson) {
    this.workExperienceJson = workExperienceJson;
  }

  public Boolean getImmediatelyAvailable() {
    return immediatelyAvailable;
  }

  public void setImmediatelyAvailable(Boolean immediatelyAvailable) {
    this.immediatelyAvailable = immediatelyAvailable;
  }

  public Integer getNoticePeriodDays() {
    return noticePeriodDays;
  }

  public void setNoticePeriodDays(Integer noticePeriodDays) {
    this.noticePeriodDays = noticePeriodDays;
  }

  public Boolean getIsPriority() {
    return isPriority;
  }

  public void setIsPriority(Boolean isPriority) {
    this.isPriority = isPriority;
  }
}
