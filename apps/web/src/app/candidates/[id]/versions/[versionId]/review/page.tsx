"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Container,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Autocomplete,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import TopBar from "@/components/TopBar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ResumeVersionDetail } from "@/lib/api";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

type ExperienceEntry = {
  title: string;
  company: string;
  start: string;
  end: string;
  location: string;
  highlights: string;
};

type EducationEntry = {
  degree: string;
  institution: string;
  startYear: string;
  endYear: string;
};

type Snapshot = {
  basics?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    experience_years?: number | null;
  };
  skills?: string[];
  education?: Array<{
    degree?: string | null;
    institution?: string | null;
    start_year?: number | null;
    end_year?: number | null;
  }>;
  experience?: Array<{
    title?: string | null;
    company?: string | null;
    start?: string | null;
    end?: string | null;
    location?: string | null;
    highlights?: string[];
  }>;
  confidence?: {
    basics?: number;
    skills?: number;
    education?: number;
    experience?: number;
  };
  parser_version?: string;
};

export default function ReviewResumeVersionPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const candidateId = params.id as string;
  const versionId = params.versionId as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["resume-version", versionId],
    queryFn: async () => {
      const res = await api.get<ResumeVersionDetail>(`/api/resume-versions/${versionId}`);
      return res.data;
    },
  });

  const parsedSnapshot: Snapshot = (() => {
    if (!data?.parsedSnapshotJson) return {};
    try {
      return JSON.parse(data.parsedSnapshotJson) as Snapshot;
    } catch {
      return {};
    }
  })();

  // Basic info state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [experienceYears, setExperienceYears] = useState("");

  // Skills state (tags)
  const [skills, setSkills] = useState<string[]>([]);

  // Multiple experience entries
  const [experienceEntries, setExperienceEntries] = useState<ExperienceEntry[]>([
    { title: "", company: "", start: "", end: "", location: "", highlights: "" },
  ]);

  // Multiple education entries
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([
    { degree: "", institution: "", startYear: "", endYear: "" },
  ]);

  // Additional fields
  const [certifications, setCertifications] = useState("");
  const [languages, setLanguages] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"resume" | "candidate">("resume");
  const [deleting, setDeleting] = useState(false);

  // Initialize form from parsed data
  useEffect(() => {
    setName(parsedSnapshot.basics?.name || "");
    setEmail(parsedSnapshot.basics?.email || "");
    setPhone(parsedSnapshot.basics?.phone || "");
    setLocation(parsedSnapshot.basics?.location || "");
    setExperienceYears(
      parsedSnapshot.basics?.experience_years != null
        ? String(parsedSnapshot.basics.experience_years)
        : ""
    );
    setSkills(parsedSnapshot.skills || []);

    // Initialize experience entries
    if (parsedSnapshot.experience && parsedSnapshot.experience.length > 0) {
      setExperienceEntries(
        parsedSnapshot.experience.map((exp) => ({
          title: exp.title || "",
          company: exp.company || "",
          start: exp.start || "",
          end: exp.end || "",
          location: exp.location || "",
          highlights: (exp.highlights || []).join("\n"),
        }))
      );
    }

    // Initialize education entries
    if (parsedSnapshot.education && parsedSnapshot.education.length > 0) {
      setEducationEntries(
        parsedSnapshot.education.map((edu) => ({
          degree: edu.degree || "",
          institution: edu.institution || "",
          startYear: edu.start_year ? String(edu.start_year) : "",
          endYear: edu.end_year ? String(edu.end_year) : "",
        }))
      );
    }
  }, [data]);


  const handleSave = async () => {
    setSaveError(null);
    setSaving(true);

    try {
      const reviewedSnapshot = {
        basics: {
          name,
          email: email || null,
          phone: phone || null,
          location: location || null,
          experience_years: experienceYears ? parseFloat(experienceYears) : null,
        },
        skills,
        experience: experienceEntries.map((exp) => ({
          title: exp.title || null,
          company: exp.company || null,
          start: exp.start || null,
          end: exp.end || null,
          location: exp.location || null,
          highlights: exp.highlights
            ? exp.highlights.split("\n").filter((h) => h.trim())
            : [],
        })),
        education: educationEntries.map((edu) => ({
          degree: edu.degree || null,
          institution: edu.institution || null,
          start_year: edu.startYear ? parseInt(edu.startYear) : null,
          end_year: edu.endYear ? parseInt(edu.endYear) : null,
        })),
        metadata: {
          certifications: certifications || null,
          languages: languages || null,
          linkedin_url: linkedinUrl || null,
          portfolio_url: portfolioUrl || null,
          twitter_url: twitterUrl || null,
          github_url: githubUrl || null,
          instagram_url: instagramUrl || null,
          facebook_url: facebookUrl || null,
        },
      };

      await api.post(`/api/resume-versions/${versionId}/confirm`, {
        reviewedSnapshotJson: JSON.stringify(reviewedSnapshot),
      });

      router.push(`/candidates/${candidateId}`);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (deleteType === "resume") {
        await api.delete(`/api/resume-versions/${versionId}`);
        router.push(`/candidates/${candidateId}`);
      } else {
        await api.delete(`/api/candidates/${candidateId}`);
        router.push("/candidates");
      }
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    } catch (err: any) {
      setSaveError(
        err?.response?.data?.message || `Failed to delete ${deleteType}`
      );
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const addExperience = () => {
    setExperienceEntries([
      ...experienceEntries,
      { title: "", company: "", start: "", end: "", location: "", highlights: "" },
    ]);
  };

  const removeExperience = (index: number) => {
    setExperienceEntries(experienceEntries.filter((_, i) => i !== index));
  };

  const updateExperience = (index: number, field: keyof ExperienceEntry, value: string) => {
    const updated = [...experienceEntries];
    updated[index][field] = value;
    setExperienceEntries(updated);
  };

  const addEducation = () => {
    setEducationEntries([
      ...educationEntries,
      { degree: "", institution: "", startYear: "", endYear: "" },
    ]);
  };

  const removeEducation = (index: number) => {
    setEducationEntries(educationEntries.filter((_, i) => i !== index));
  };

  const updateEducation = (index: number, field: keyof EducationEntry, value: string) => {
    const updated = [...educationEntries];
    updated[index][field] = value;
    setEducationEntries(updated);
  };

  if (isLoading) {
    return (
      <Box>
        <TopBar title="Review Resume" />
        <Container sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <TopBar title="Review Resume" />
        <Container sx={{ mt: 2 }}>
          <Alert severity="error">Failed to load resume version</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <TopBar title={`Review Resume: ${name || "Unnamed Candidate"}`} />
      <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>

        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
            {saveError}
          </Alert>
        )}

        {/* Basic Information */}
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            <TextField
              label="Full Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Years of Experience"
                  type="number"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Stack>
        </Paper>

        {/* Skills (Tags) */}
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Skills
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={skills}
            onChange={(_, newValue) => setSkills(newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  key={option}
                  color="primary"
                  variant="outlined"
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Type and press Enter to add skills"
                helperText="Add skills as tags for better searchability"
              />
            )}
          />
        </Paper>

        {/* Experience (Multiple Entries) */}
        <Paper sx={{ p: 3, mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">Work Experience</Typography>
            <Button startIcon={<AddIcon />} onClick={addExperience} variant="outlined" size="small">
              Add Experience
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            {experienceEntries.map((exp, index) => (
              <Accordion key={index} defaultExpanded={index === 0}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    {exp.title || exp.company || `Experience #${index + 1}`}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Job Title"
                          value={exp.title}
                          onChange={(e) => updateExperience(index, "title", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Company"
                          value={exp.company}
                          onChange={(e) => updateExperience(index, "company", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Start Date"
                          value={exp.start}
                          onChange={(e) => updateExperience(index, "start", e.target.value)}
                          placeholder="e.g., Jan 2020"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="End Date"
                          value={exp.end}
                          onChange={(e) => updateExperience(index, "end", e.target.value)}
                          placeholder="e.g., Present"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Location"
                          value={exp.location}
                          onChange={(e) => updateExperience(index, "location", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                    <TextField
                      label="Key Achievements / Responsibilities"
                      value={exp.highlights}
                      onChange={(e) => updateExperience(index, "highlights", e.target.value)}
                      multiline
                      rows={3}
                      placeholder="One per line"
                      fullWidth
                    />
                    {experienceEntries.length > 1 && (
                      <Button
                        startIcon={<DeleteIcon />}
                        onClick={() => removeExperience(index)}
                        color="error"
                        size="small"
                      >
                        Remove This Experience
                      </Button>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Paper>

        {/* Education (Multiple Entries) */}
        <Paper sx={{ p: 3, mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">Education</Typography>
            <Button startIcon={<AddIcon />} onClick={addEducation} variant="outlined" size="small">
              Add Education
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            {educationEntries.map((edu, index) => (
              <Accordion key={index} defaultExpanded={index === 0}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    {edu.degree || edu.institution || `Education #${index + 1}`}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Degree / Qualification"
                          value={edu.degree}
                          onChange={(e) => updateEducation(index, "degree", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Institution / University"
                          value={edu.institution}
                          onChange={(e) => updateEducation(index, "institution", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Start Year"
                          type="number"
                          value={edu.startYear}
                          onChange={(e) => updateEducation(index, "startYear", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="End Year"
                          type="number"
                          value={edu.endYear}
                          onChange={(e) => updateEducation(index, "endYear", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                    {educationEntries.length > 1 && (
                      <Button
                        startIcon={<DeleteIcon />}
                        onClick={() => removeEducation(index)}
                        color="error"
                        size="small"
                      >
                        Remove This Education
                      </Button>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Paper>

        {/* Additional Information */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Additional Information
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            <TextField
              label="Certifications"
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              multiline
              rows={2}
              placeholder="e.g., AWS Certified Solutions Architect, PMP"
              fullWidth
            />
            <TextField
              label="Languages"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="e.g., English (Native), Spanish (Fluent)"
              fullWidth
            />
            <Divider sx={{ my: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Professional Links
              </Typography>
            </Divider>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="LinkedIn URL"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Portfolio / Website URL"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://..."
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="GitHub URL"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Twitter / X URL"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://twitter.com/..."
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Instagram URL"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Facebook URL"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/..."
                  fullWidth
                />
              </Grid>
            </Grid>
          </Stack>
        </Paper>

        {/* Action Buttons */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={saving || !name}
            sx={{ flex: 1 }}
          >
            {saving ? <CircularProgress size={24} /> : "Save Changes"}
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="large"
            onClick={() => {
              setDeleteType("resume");
              setDeleteDialogOpen(true);
            }}
          >
            Delete Resume
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="large"
            onClick={() => {
              setDeleteType("candidate");
              setDeleteDialogOpen(true);
            }}
          >
            Delete Candidate
          </Button>
        </Stack>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>
            Confirm Delete {deleteType === "resume" ? "Resume" : "Candidate"}
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this {deleteType}? This action cannot be undone.
              {deleteType === "candidate" &&
                " This will also delete all associated resumes."}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button onClick={handleDelete} color="error" disabled={deleting}>
              {deleting ? <CircularProgress size={20} /> : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
