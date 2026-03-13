"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  CircularProgress,
  Alert,
  TextField,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  Menu,
  MenuItem,
  Avatar,
  Paper,
  IconButton,
  Breadcrumbs,
  Link,
  useTheme,
  alpha,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import TopBar from "@/components/TopBar"; // Assuming this handles the Logout button
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Candidate } from "@/lib/api";

// Icons
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import HomeIcon from "@mui/icons-material/Home";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import CircleIcon from "@mui/icons-material/Circle";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import VisibilityIcon from "@mui/icons-material/Visibility";
import StarIcon from "@mui/icons-material/Star";

// --- Helper for Avatar Colors ---
function stringToColor(string: string) {
  let hash = 0;
  for (let i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

function getAvatarProps(name: string) {
  return {
    sx: {
      bgcolor: alpha(stringToColor(name), 0.1),
      color: stringToColor(name),
      fontWeight: "bold",
      width: 48,
      height: 48,
      fontSize: "1rem",
    },
    children: name.charAt(0).toUpperCase(),
  };
}

export default function CandidatesPage() {
  const router = useRouter();
  const theme = useTheme();
  const qc = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [experienceFilter, setExperienceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  
  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
  });

  // Data Fetching
  const { data, isLoading, error } = useQuery({
    queryKey: ["candidates"],
    queryFn: async () => {
      const res = await api.get<Candidate[]>("/api/candidates");
      return res.data;
    },
  });

  // Filtering Logic
  const filteredCandidates = useMemo(() => {
    let list = data || [];

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((c) =>
        [c.name, c.email, c.phone, c.location, c.primarySkill].some((v) =>
          (v || "").toLowerCase().includes(s)
        )
      );
    }

    if (experienceFilter !== "all") {
      list = list.filter((c) => {
        const exp = c.experienceYears || 0;
        if (experienceFilter === "0-2") return exp >= 0 && exp <= 2;
        if (experienceFilter === "3-5") return exp >= 3 && exp <= 5;
        if (experienceFilter === "6-10") return exp >= 6 && exp <= 10;
        if (experienceFilter === "10+") return exp > 10;
        return true;
      });
    }

    if (statusFilter !== "all") {
      list = list.filter((c) => c.availabilityStatus === statusFilter);
    }

    return list;
  }, [data, search, experienceFilter, statusFilter]);

  // Logic Helpers
  const getAvailabilityColor = (status?: string) => {
    switch (status) {
      case "AVAILABLE": return theme.palette.success.main;
      case "BUSY": return theme.palette.error.main;
      default: return theme.palette.text.disabled;
    }
  };

  const getAvailabilityLabel = (status?: string) => {
    switch (status) {
      case "AVAILABLE": return "Available";
      case "BUSY": return "Engaged";
      default: return "Unknown";
    }
  };

  // Actions
  async function createCandidate() {
    if (!form.name.trim()) {
      setCreateError("Name is required");
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const res = await api.post("/api/candidates", form);
      await qc.invalidateQueries({ queryKey: ["candidates"] });
      setCreateOpen(false);
      setForm({ name: "", email: "", phone: "", location: "" });
      router.push(`/candidates/${res.data.id}`);
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || "Failed to create candidate");
    } finally {
      setCreating(false);
    }
  }

  function exportToCSV() {
    if (filteredCandidates.length === 0) return;
    
    const headers = ["Name", "Email", "Phone", "Location", "Skill", "Experience", "Status"];
    const rows = filteredCandidates.map((c) => [
      c.name, c.email, c.phone, c.location, c.primarySkill, c.experienceYears, c.availabilityStatus
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `candidates_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  }

  // --- Render ---

  if (isLoading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
        <TopBar title="Talent Database" />
        <Container sx={{ mt: 8, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={40} thickness={4} />
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
        <TopBar title="Talent Database" />
        <Container sx={{ mt: 4 }}>
          <Alert severity="error" variant="filled">Failed to load candidate database.</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "#F8F9FA", minHeight: "100vh", pb: 8 }}>
      {/* If TopBar has the logout button, we render it here.
         We treat it as the "Global Navigation" layer.
      */}
      <TopBar title="Recruitment Portal" />
      
      <Container maxWidth="xl">
        {/* --- PAGE HEADER SECTION --- 
            This bridges the gap between the "Logout" bar and the content.
        */}
        <Box sx={{ py: 4 }}>
          {/* Breadcrumbs for Context */}
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />} 
            aria-label="breadcrumb"
            sx={{ mb: 2, "& .MuiBreadcrumbs-li": { display: "flex", alignItems: "center" } }}
          >
            <Link underline="hover" color="inherit" href="/" sx={{ display: 'flex', alignItems: 'center' }}>
              <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Home
            </Link>
            <Typography color="text.primary" fontWeight={500}>Candidates</Typography>
          </Breadcrumbs>

          {/* Title & Actions Row */}
          <Stack 
            direction={{ xs: "column", md: "row" }} 
            justifyContent="space-between" 
            alignItems={{ md: "flex-end" }} 
            spacing={3}
          >
            <Box>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.5px", color: "#1a1a1a" }}>
                  Candidate Pool
                </Typography>
                <Chip 
                    label={filteredCandidates.length} 
                    size="small" 
                    sx={{ bgcolor: "grey.200", fontWeight: "bold", color: "text.primary" }} 
                />
              </Stack>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                View, manage, and track potential candidates for open positions.
              </Typography>
            </Box>

            {/* Main Action Buttons */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportToCSV}
                sx={{ 
                  borderRadius: 2, 
                  textTransform: "none", 
                  fontWeight: 600,
                  borderColor: "grey.300",
                  color: "text.primary",
                  "&:hover": { borderColor: "grey.400", bgcolor: "grey.50" }
                }}
              >
                Export
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
                sx={{ 
                  borderRadius: 2, 
                  textTransform: "none", 
                  fontWeight: 600, 
                  px: 3,
                  boxShadow: "0 4px 14px 0 rgba(0,118,255,0.39)" 
                }}
              >
                Add Candidate
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Divider sx={{ mb: 4, borderColor: "grey.200" }} />

        {/* --- TOOLBAR SECTION --- */}
        <Paper
          elevation={0}
          sx={{
            p: 1,
            mb: 4,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "grey.200",
            display: "flex",
            alignItems: "center",
            gap: 1,
            bgcolor: "white"
          }}
        >
          <TextField
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ 
              flexGrow: 1, 
              "& .MuiOutlinedInput-root": {
                "& fieldset": { border: "none" },
                "& input": { py: 1.5 }
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          
          <Divider orientation="vertical" flexItem sx={{ height: 28, alignSelf: "center", mx: 1 }} />

          <Button
            onClick={(e) => setFilterAnchor(e.currentTarget)}
            startIcon={<FilterListIcon />}
            color="inherit"
            sx={{ 
              borderRadius: 2, 
              px: 2,
              textTransform: "none",
              color: (experienceFilter !== "all" || statusFilter !== "all") ? "primary.main" : "text.secondary",
              bgcolor: (experienceFilter !== "all" || statusFilter !== "all") ? alpha(theme.palette.primary.main, 0.08) : "transparent"
            }}
          >
            Filters
          </Button>

          <Divider orientation="vertical" flexItem sx={{ height: 28, alignSelf: "center", mx: 1 }} />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            size="small"
            sx={{ borderRadius: 2 }}
          >
            <ToggleButton value="grid" aria-label="grid view">
              <ViewModuleIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="table" aria-label="table view">
              <ViewListIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Paper>

        {/* Filters Menu */}
        <Menu
          anchorEl={filterAnchor}
          open={Boolean(filterAnchor)}
          onClose={() => setFilterAnchor(null)}
          PaperProps={{
            elevation: 3,
            sx: { borderRadius: 3, mt: 1, minWidth: 220, border: "1px solid", borderColor: "grey.100" }
          }}
        >
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 1 }}>EXPERIENCE</Typography>
          </Box>
          {["all", "0-2", "3-5", "6-10", "10+"].map((opt) => (
             <MenuItem 
                key={opt} 
                onClick={() => { setExperienceFilter(opt); setFilterAnchor(null); }}
                selected={experienceFilter === opt}
                sx={{ fontSize: "0.9rem", py: 1 }}
             >
               {opt === "all" ? "Any Experience" : `${opt} Years`}
             </MenuItem>
          ))}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ p: 2, pb: 1, pt: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 1 }}>STATUS</Typography>
          </Box>
          {["all", "AVAILABLE", "BUSY"].map((opt) => (
             <MenuItem 
                key={opt} 
                onClick={() => { setStatusFilter(opt); setFilterAnchor(null); }}
                selected={statusFilter === opt}
                sx={{ fontSize: "0.9rem", py: 1 }}
             >
               {opt === "all" ? "Any Status" : opt.charAt(0) + opt.slice(1).toLowerCase()}
             </MenuItem>
          ))}
        </Menu>

        {/* --- GRID CONTENT --- */}
        {filteredCandidates.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8, bgcolor: "white", borderRadius: 4, border: "1px dashed", borderColor: "grey.300" }}>
            <SearchIcon sx={{ fontSize: 48, color: "grey.300", mb: 2 }} />
            <Typography variant="h6" color="text.primary" gutterBottom>No candidates found</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Try adjusting your search terms or filters.
            </Typography>
            <Button variant="outlined" size="small" onClick={() => { setSearch(""); setExperienceFilter("all"); setStatusFilter("all"); }}>
              Clear Filters
            </Button>
          </Box>
        ) : viewMode === "grid" ? (
          <Grid container spacing={3}>
            {filteredCandidates.map((candidate) => (
                <Grid item xs={12} sm={6} lg={4} key={candidate.id}>
                  <Card
                    elevation={0}
                    onClick={() => router.push(`/candidates/${candidate.id}`)}
                    sx={{
                      height: "100%",
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: "grey.200",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                      "&:hover": {
                        borderColor: "primary.main",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
                        transform: "translateY(-2px)"
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                             <Avatar {...getAvatarProps(candidate.name)} />
                             <IconButton size="small" onClick={(e) => { e.stopPropagation(); }}>
                                <MoreHorizIcon fontSize="small" color="disabled" />
                             </IconButton>
                        </Stack>
                        <Box sx={{ mt: 2, mb: 1 }}>
                            <Typography variant="h6" fontWeight={700} noWrap>
                                {candidate.name}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                                <WorkOutlineIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                                <Typography variant="body2" color="text.secondary">
                                    {candidate.primarySkill || "N/A"}
                                </Typography>
                            </Stack>
                        </Box>
                        <Divider sx={{ my: 2, borderStyle: "dashed" }} />
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                <PlaceOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                <Typography variant="body2" color="text.primary" noWrap>
                                    {candidate.location || "Remote"}
                                </Typography>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                <EmailOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                <Typography variant="body2" color="text.primary" noWrap sx={{ opacity: 0.8 }}>
                                    {candidate.email}
                                </Typography>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                <PhoneOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                <Typography variant="body2" color="text.primary" sx={{ opacity: 0.8 }}>
                                    {candidate.phone || "--"}
                                </Typography>
                            </Stack>
                        </Stack>
                    </CardContent>
                    <Box sx={{ 
                        p: 2, 
                        bgcolor: "grey.50", 
                        borderTop: "1px solid", 
                        borderColor: "grey.100",
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center"
                    }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <CircleIcon sx={{ fontSize: 10, color: getAvailabilityColor(candidate.availabilityStatus) }} />
                            <Typography variant="caption" fontWeight={600} color="text.secondary">
                                {getAvailabilityLabel(candidate.availabilityStatus)}
                            </Typography>
                        </Stack>
                        <Chip 
                            label={`${candidate.experienceYears || 0}y exp`} 
                            size="small"
                            sx={{ height: 24, fontSize: "0.75rem", bgcolor: "white", border: "1px solid", borderColor: "grey.200" }} 
                        />
                    </Box>
                  </Card>
                </Grid>
              ))}
          </Grid>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
            <Table sx={{ minWidth: 650 }} aria-label="candidates table">
              <TableHead sx={{ bgcolor: "grey.50" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Experience</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Key Skills</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tags</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCandidates.map((candidate) => (
                  <TableRow
                    key={candidate.id}
                    hover
                    sx={{ "&:last-child td, &:last-child th": { border: 0 }, cursor: "pointer" }}
                    onClick={() => router.push(`/candidates/${candidate.id}`)}
                  >
                    <TableCell component="th" scope="row">
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar {...getAvatarProps(candidate.name)} sx={{ ...getAvatarProps(candidate.name).sx, width: 32, height: 32, fontSize: "0.8rem" }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{candidate.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{candidate.email}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{candidate.location || "Remote"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${candidate.experienceYears || 0}y`} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="primary.main" fontWeight={500}>
                        {candidate.primarySkill || "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        {candidate.isPriority && (
                          <Tooltip title="Priority Candidate">
                            <Chip 
                              icon={<StarIcon sx={{ fontSize: "14px !important" }} />} 
                              label="Priority" 
                              size="small" 
                              color="warning" 
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                          </Tooltip>
                        )}
                        <Chip 
                          label={getAvailabilityLabel(candidate.availabilityStatus)} 
                          size="small" 
                          sx={{ 
                            height: 20, 
                            fontSize: "0.7rem",
                            bgcolor: alpha(getAvailabilityColor(candidate.availabilityStatus), 0.1),
                            color: getAvailabilityColor(candidate.availabilityStatus),
                            border: `1px solid ${alpha(getAvailabilityColor(candidate.availabilityStatus), 0.2)}`
                          }} 
                        />
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/candidates/${candidate.id}`);
                        }}
                        sx={{ borderRadius: 1.5, textTransform: "none", boxShadow: "none" }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Create Candidate Dialog */}
        <Dialog 
            open={createOpen} 
            onClose={() => setCreateOpen(false)} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Add New Candidate</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 3 }}>
            {createError && <Alert severity="error" sx={{ mb: 3 }}>{createError}</Alert>}
            <Stack spacing={3}>
              <TextField
                label="Full Name"
                placeholder="Ex. John Smith"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                fullWidth
                variant="outlined"
                autoFocus
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                    <TextField
                        label="Email Address"
                        placeholder="john@example.com"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        label="Phone Number"
                        placeholder="+1 (555) 000-0000"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        fullWidth
                    />
                </Grid>
              </Grid>
              <TextField
                label="Location"
                placeholder="Ex. New York, NY"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setCreateOpen(false)} disabled={creating} size="large" sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button 
                onClick={createCandidate} 
                variant="contained" 
                disabled={creating}
                size="large"
                sx={{ borderRadius: 2, px: 4, boxShadow: "none" }}
            >
              {creating ? <CircularProgress size={24} color="inherit" /> : "Save Profile"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}