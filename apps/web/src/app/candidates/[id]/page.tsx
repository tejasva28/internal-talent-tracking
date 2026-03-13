"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Button,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Stack,
  Paper,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import TopBar from "@/components/TopBar";
import AvailabilityUI from "@/components/AvailabilityUI";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Candidate, type ResumeVersion, type ResumeVersionDetail, API_BASE } from "@/lib/api";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventIcon from "@mui/icons-material/Event";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { Switch, FormControlLabel, TextField } from "@mui/material";

function statusChip(status: ResumeVersion["reviewStatus"]) {
  const color = status === "CONFIRMED" ? "success" : status === "REJECTED" ? "error" : "warning";
  return <Chip size="small" label={status} color={color as any} />;
}

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const candidateId = params.id;
  const router = useRouter();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const candidateQuery = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: async () => {
      const res = await api.get<Candidate>(`/api/candidates/${candidateId}`);
      return res.data;
    },
  });

  const versionsQuery = useQuery({
    queryKey: ["versions", candidateId],
    queryFn: async () => {
      const res = await api.get<ResumeVersion[]>(`/api/candidates/${candidateId}/resume-versions`);
      return res.data;
    },
  });

  // Get the latest confirmed resume version to show summary
  const latestConfirmedVersionId = useMemo(() => {
    const versions = versionsQuery.data || [];
    const confirmed = versions.find((v) => v.reviewStatus === "CONFIRMED");
    return confirmed?.id;
  }, [versionsQuery.data]);

  // Fetch full details of the latest confirmed version
  const latestVersionQuery = useQuery({
    queryKey: ["version-detail", latestConfirmedVersionId],
    queryFn: async () => {
      if (!latestConfirmedVersionId) return null;
      const res = await api.get<ResumeVersionDetail>(`/api/resume-versions/${latestConfirmedVersionId}`);
      return res.data;
    },
    enabled: !!latestConfirmedVersionId,
  });

  const latestVersionParsedData = useMemo(() => {
    const version = latestVersionQuery.data;
    if (!version?.reviewedSnapshotJson) return null;
    try {
      return JSON.parse(version.reviewedSnapshotJson);
    } catch {
      return null;
    }
  }, [latestVersionQuery.data]);

  const candidate = candidateQuery.data;

  // Calculate dates
  const lastUpdated = candidateQuery.data?.lastResumeUpdate
    ? new Date(candidateQuery.data.lastResumeUpdate)
    : null;

  const expirationDate = lastUpdated
    ? new Date(lastUpdated.getTime() + 180 * 24 * 60 * 60 * 1000) // 6 months
    : null;

  const daysUntilExpiration = expirationDate
    ? Math.floor((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  async function uploadResume(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(`/api/candidates/${candidateId}/resumes`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // After upload, go straight to review screen for the created version
      const versionId = res.data.id as string;
      await qc.invalidateQueries({ queryKey: ["versions", candidateId] });
      router.push(`/candidates/${candidateId}/versions/${versionId}/review`);
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function downloadResume(versionId: string, filename: string) {
    try {
      const response = await api.get(`/api/resume-versions/${versionId}/download`, {
        responseType: "blob",
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download resume:", err);
      alert("Failed to download resume. Please try again.");
    }
  }

  async function handleSaveAvailability(data: {
    immediatelyAvailable: boolean;
    noticePeriodDays: number;
    isPriority: boolean
  }) {
    try {
      // Update notice period and immediate availability
      await api.patch(
        `/api/candidates/${candidateId}/notice-period?immediatelyAvailable=${data.immediatelyAvailable}&noticePeriodDays=${data.noticePeriodDays}`
      );

      // Update priority status
      await api.patch(`/api/candidates/${candidateId}/priority?isPriority=${data.isPriority}`);

      // Refresh candidate data
      await qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
    } catch (err) {
      console.error("Failed to update availability:", err);
      throw new Error("Failed to save changes");
    }
  }

  if (candidateQuery.isLoading) {
    return (
      <Box>
        <TopBar title="Candidate" />
        <Container sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  if (candidateQuery.error) {
    return (
      <Box>
        <TopBar title="Candidate" />
        <Container sx={{ mt: 2 }}>
          <Alert severity="error">Failed to load candidate.</Alert>
        </Container>
      </Box>
    );
  }

  const c = candidateQuery.data!;
  const versions = versionsQuery.data || [];

  return (
    <Box>
      <TopBar title="Candidate Details" />
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        <Button onClick={() => router.push("/candidates")} sx={{ mb: 2 }}>
          ← Back to Candidates
        </Button>

        {/* Main Candidate Info Card */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ md: "flex-start" }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                {c.name}
              </Typography>

              {/* Date Tags */}
              <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
                {lastUpdated && (
                  <Chip
                    icon={<AccessTimeIcon />}
                    label={`Updated: ${lastUpdated.toLocaleDateString()}`}
                    color="info"
                    size="small"
                  />
                )}
                {expirationDate && (
                  <Chip
                    icon={<EventIcon />}
                    label={
                      daysUntilExpiration! > 0
                        ? `Expires in ${daysUntilExpiration} days`
                        : `Expired ${Math.abs(daysUntilExpiration!)} days ago`
                    }
                    color={daysUntilExpiration! > 30 ? "success" : daysUntilExpiration! > 0 ? "warning" : "error"}
                    size="small"
                  />
                )}
                {!lastUpdated && (
                  <Chip label="No Resume Uploaded" color="default" size="small" />
                )}
              </Stack>

              {/* Basic Contact Info */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{c.email || "—"}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{c.phone || "—"}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Location</Typography>
                  <Typography variant="body1">{c.location || "—"}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Experience</Typography>
                  <Typography variant="body1">
                    {c.experienceYears ? `${c.experienceYears} years` : "—"}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Primary Skill</Typography>
                  <Typography variant="body1">{c.primarySkill || "—"}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Typography variant="body1">{c.availabilityStatus || "UNKNOWN"}</Typography>
                </Grid>
              </Grid>
            </Box>

            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadResume(f);
                }}
              />
              <Button
                variant="contained"
                size="large"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload New Resume"}
              </Button>
            </Box>
          </Stack>

          {uploadError && (
            <Alert sx={{ mt: 2 }} severity="error" onClose={() => setUploadError(null)}>
              {uploadError}
            </Alert>
          )}
        </Paper>

        {/* Availability & Priority Section */}
        <AvailabilityUI
          candidate={candidate}
          onSave={handleSaveAvailability}
        />

        {/* Latest Resume Summary */}
        {latestVersionParsedData && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Latest Resume Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={3}>
              {/* Skills */}
              {latestVersionParsedData.skills && latestVersionParsedData.skills.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Skills
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {latestVersionParsedData.skills.map((skill: string, idx: number) => (
                      <Chip key={idx} label={skill} size="small" variant="outlined" color="primary" />
                    ))}
                  </Stack>
                </Grid>
              )}

              {/* Experience */}
              {latestVersionParsedData.experience && latestVersionParsedData.experience.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Work Experience
                  </Typography>
                  <Stack spacing={1.5}>
                    {latestVersionParsedData.experience.map((exp: any, idx: number) => (
                      <Card key={idx} variant="outlined">
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {exp.title || "Untitled Position"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {exp.company} {exp.start && exp.end && `• ${exp.start} - ${exp.end}`}
                          </Typography>
                          {exp.location && (
                            <Typography variant="caption" color="text.secondary">
                              {exp.location}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Grid>
              )}

              {/* Education */}
              {latestVersionParsedData.education && latestVersionParsedData.education.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Education
                  </Typography>
                  <Stack spacing={1}>
                    {latestVersionParsedData.education.map((edu: any, idx: number) => (
                      <Box key={idx}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {edu.degree || "Degree"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {edu.institution}
                          {edu.start_year && edu.end_year && ` • ${edu.start_year} - ${edu.end_year}`}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Grid>
              )}

              {/* Additional Info */}
              {latestVersionParsedData.metadata && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Additional Information
                  </Typography>
                  <Grid container spacing={2}>
                    {latestVersionParsedData.metadata.certifications && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Certifications</Typography>
                        <Typography variant="body2">{latestVersionParsedData.metadata.certifications}</Typography>
                      </Grid>
                    )}
                    {latestVersionParsedData.metadata.languages && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Languages</Typography>
                        <Typography variant="body2">{latestVersionParsedData.metadata.languages}</Typography>
                      </Grid>
                    )}
                    {latestVersionParsedData.metadata.linkedin_url && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">LinkedIn</Typography>
                        <Typography
                          variant="body2"
                          component="a"
                          href={latestVersionParsedData.metadata.linkedin_url}
                          target="_blank"
                          sx={{ color: "primary.main", textDecoration: "none" }}
                        >
                          View Profile
                        </Typography>
                      </Grid>
                    )}
                    {latestVersionParsedData.metadata.portfolio_url && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Portfolio</Typography>
                        <Typography
                          variant="body2"
                          component="a"
                          href={latestVersionParsedData.metadata.portfolio_url}
                          target="_blank"
                          sx={{ color: "primary.main", textDecoration: "none" }}
                        >
                          View Portfolio
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Resume Versions */}
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          All Resume Versions
        </Typography>

        {versionsQuery.isLoading ? (
          <CircularProgress />
        ) : versionsQuery.error ? (
          <Alert severity="error">Failed to load versions.</Alert>
        ) : versions.length === 0 ? (
          <Alert severity="info">No resumes uploaded yet. Upload one to get started!</Alert>
        ) : (
          <Stack spacing={1.5}>
            {versions.map((v) => (
              <Paper key={v.id} sx={{ p: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{v.originalFilename}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Uploaded: {new Date(v.uploadedAt).toLocaleString()}
                    </Typography>
                    {v.reviewedAt && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        Reviewed: {new Date(v.reviewedAt).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                  {statusChip(v.reviewStatus)}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadResume(v.id, v.originalFilename);
                    }}
                  >
                    View Resume
                  </Button>
                  <Button
                    size="small"
                    variant={v.reviewStatus === "PENDING" ? "contained" : "outlined"}
                    onClick={() => router.push(`/candidates/${candidateId}/versions/${v.id}/review`)}
                  >
                    {v.reviewStatus === "PENDING" ? "Review Now" : "View / Edit"}
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
