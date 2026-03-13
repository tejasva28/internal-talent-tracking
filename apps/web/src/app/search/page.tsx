"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Box,
    Container,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    CardActionArea,
    Chip,
    Stack,
    Alert,
    CircularProgress,
    Divider,
    ToggleButton,
    ToggleButtonGroup,
    Paper,
    alpha,
    useTheme,
    LinearProgress,
    Tooltip,
} from "@mui/material";
import TopBar from "@/components/TopBar";
import SearchIcon from "@mui/icons-material/Search";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BoltIcon from "@mui/icons-material/Bolt";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import WorkIcon from "@mui/icons-material/Work";
import StarIcon from "@mui/icons-material/Star";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import { searchCandidates, ragSearchCandidates, type SearchResult } from "@/lib/api";

type SearchMode = "quick" | "rag";

const EXAMPLE_QUERIES = [
    "Java developer with Spring Boot and microservices",
    "React frontend engineer with TypeScript experience",
    "Python data engineer with 5+ years experience",
    "Full-stack developer in Bangalore immediately available",
    "DevOps engineer with Kubernetes and AWS",
    "Machine learning engineer with PyTorch",
];

export default function SearchPage() {
    const theme = useTheme();
    const router = useRouter();

    const [query, setQuery] = useState("");
    const [mode, setMode] = useState<SearchMode>("rag");
    const [results, setResults] = useState<SearchResult[] | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const handleSearch = useCallback(async (q?: string) => {
        const searchQuery = q ?? query;
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError(null);
        setSearched(true);
        try {
            const res =
                mode === "rag"
                    ? await ragSearchCandidates(searchQuery, 10)
                    : await searchCandidates(searchQuery, 10);
            setResults(res.results);
            setSummary(res.searchSummary);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Search failed. Make sure candidates have been indexed.");
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [query, mode]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSearch();
    };

    const handleExampleClick = (example: string) => {
        setQuery(example);
        handleSearch(example);
    };

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
            <TopBar title="AI Candidate Search" />

            <Container maxWidth="lg" sx={{ py: 4 }}>
                {/* Hero Search Section */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3, md: 5 },
                        mb: 4,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                        border: "1px solid",
                        borderColor: alpha(theme.palette.primary.main, 0.15),
                    }}
                >
                    <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
                        <PersonSearchIcon sx={{ fontSize: 44, color: "primary.main" }} />
                        <Typography
                            variant="h4"
                            sx={{ fontWeight: 800, letterSpacing: "-0.5px", textAlign: "center" }}
                        >
                            Find the Right Candidate
                        </Typography>
                        <Typography
                            variant="body1"
                            color="text.secondary"
                            sx={{ textAlign: "center", maxWidth: 520 }}
                        >
                            Describe the candidate you're looking for in plain English. Our AI
                            will semantically match skills, experience, and context.
                        </Typography>
                    </Stack>

                    {/* Mode toggle */}
                    <Stack alignItems="center" sx={{ mb: 2 }}>
                        <ToggleButtonGroup
                            value={mode}
                            exclusive
                            onChange={(_, v) => v && setMode(v)}
                            size="small"
                            sx={{ bgcolor: "white", borderRadius: 2, boxShadow: 1 }}
                        >
                            <ToggleButton value="quick" sx={{ px: 2.5, gap: 0.5 }}>
                                <BoltIcon fontSize="small" />
                                Quick Search
                            </ToggleButton>
                            <ToggleButton value="rag" sx={{ px: 2.5, gap: 0.5 }}>
                                <AutoAwesomeIcon fontSize="small" />
                                AI Search
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                            {mode === "rag"
                                ? "AI Search uses Gemini to re-rank results and explain each match (~3s)"
                                : "Quick Search uses vector similarity only — instant results"}
                        </Typography>
                    </Stack>

                    {/* Search input */}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <TextField
                            fullWidth
                            placeholder="e.g. Java developer with 5 years microservices experience in Bangalore"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            variant="outlined"
                            id="search-input"
                            InputProps={{
                                sx: {
                                    bgcolor: "white",
                                    borderRadius: 2,
                                    fontSize: "1rem",
                                },
                            }}
                        />
                        <Button
                            id="search-button"
                            variant="contained"
                            size="large"
                            onClick={() => handleSearch()}
                            disabled={loading || !query.trim()}
                            startIcon={mode === "rag" ? <AutoAwesomeIcon /> : <SearchIcon />}
                            sx={{
                                minWidth: 140,
                                borderRadius: 2,
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {loading ? "Searching…" : mode === "rag" ? "AI Search" : "Search"}
                        </Button>
                    </Stack>

                    {/* Loading progress */}
                    {loading && (
                        <Box sx={{ mt: 2 }}>
                            <LinearProgress sx={{ borderRadius: 1 }} />
                            {mode === "rag" && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                                    Retrieving candidates → Re-ranking with Gemini AI…
                                </Typography>
                            )}
                        </Box>
                    )}

                    {/* Example queries */}
                    {!searched && !loading && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                Try an example
                            </Typography>
                            <Stack direction="row" flexWrap="wrap" gap={1}>
                                {EXAMPLE_QUERIES.map((example) => (
                                    <Chip
                                        key={example}
                                        label={example}
                                        onClick={() => handleExampleClick(example)}
                                        variant="outlined"
                                        size="small"
                                        clickable
                                        sx={{
                                            bgcolor: "white",
                                            "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                                        }}
                                    />
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Paper>

                {/* Error */}
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* AI Summary */}
                {summary && !loading && (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            mb: 3,
                            bgcolor: alpha(theme.palette.info.main, 0.06),
                            border: "1px solid",
                            borderColor: alpha(theme.palette.info.main, 0.2),
                            borderRadius: 2,
                            display: "flex",
                            gap: 1.5,
                            alignItems: "flex-start",
                        }}
                    >
                        <AutoAwesomeIcon sx={{ color: "info.main", mt: 0.2, flexShrink: 0 }} />
                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "info.dark", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                Gemini AI Summary
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {summary}
                            </Typography>
                        </Box>
                    </Paper>
                )}

                {/* Results */}
                {results !== null && !loading && (
                    <>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {results.length > 0
                                    ? `${results.length} Candidate${results.length !== 1 ? "s" : ""} Found`
                                    : "No candidates found"}
                            </Typography>
                            {results.length > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                    Sorted by {mode === "rag" ? "AI match score" : "similarity score"}
                                </Typography>
                            )}
                        </Stack>

                        {results.length === 0 && (
                            <Alert severity="info">
                                No candidates matched your query. Try a different search or upload and confirm more resumes.
                            </Alert>
                        )}

                        <Stack spacing={2}>
                            {results.map((result) => (
                                <SearchResultCard
                                    key={result.candidate.id}
                                    result={result}
                                    mode={mode}
                                    onView={() => router.push(`/candidates/${result.candidate.id}`)}
                                />
                            ))}
                        </Stack>
                    </>
                )}
            </Container>
        </Box>
    );
}

// ── Result Card ────────────────────────────────────────────────────────────────

function SearchResultCard({
    result,
    mode,
    onView,
}: {
    result: SearchResult;
    mode: SearchMode;
    onView: () => void;
}) {
    const theme = useTheme();
    const { candidate, score, rank, explanation, keyStrengths } = result;

    const scoreColor =
        score >= 8 ? theme.palette.success.main :
            score >= 5 ? theme.palette.warning.main :
                theme.palette.error.main;

    return (
        <Card
            elevation={0}
            sx={{
                border: "1px solid",
                borderColor: rank === 1 ? alpha(theme.palette.primary.main, 0.3) : "grey.200",
                borderRadius: 2,
                transition: "all 0.2s ease",
                "&:hover": {
                    boxShadow: 4,
                    borderColor: "primary.main",
                    transform: "translateY(-1px)",
                },
                ...(rank === 1 && {
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, white 100%)`,
                }),
            }}
        >
            <CardActionArea onClick={onView} sx={{ p: 0 }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }}>
                        {/* Rank badge */}
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: rank === 1 ? "primary.main" : alpha(theme.palette.grey[400], 0.15),
                                color: rank === 1 ? "white" : "text.secondary",
                                fontWeight: 800,
                                fontSize: "1.1rem",
                                flexShrink: 0,
                            }}
                        >
                            {rank}
                        </Box>

                        {/* Main content */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 0.5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    {candidate.name}
                                </Typography>
                                {rank === 1 && (
                                    <Chip
                                        icon={<StarIcon />}
                                        label="Best Match"
                                        size="small"
                                        color="primary"
                                        sx={{ fontWeight: 700 }}
                                    />
                                )}
                                {candidate.isPriority && (
                                    <Chip label="Priority" size="small" color="warning" />
                                )}
                                {candidate.immediatelyAvailable && (
                                    <Chip label="Immediately Available" size="small" color="success" />
                                )}
                            </Stack>

                            {/* Meta */}
                            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 1.5 }}>
                                {candidate.location && (
                                    <Stack direction="row" spacing={0.4} alignItems="center">
                                        <LocationOnIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                                        <Typography variant="caption" color="text.secondary">{candidate.location}</Typography>
                                    </Stack>
                                )}
                                {candidate.experienceYears && (
                                    <Stack direction="row" spacing={0.4} alignItems="center">
                                        <WorkIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                                        <Typography variant="caption" color="text.secondary">
                                            {candidate.experienceYears} yrs exp
                                        </Typography>
                                    </Stack>
                                )}
                                {candidate.primarySkill && (
                                    <Chip label={candidate.primarySkill} size="small" variant="outlined" color="primary" />
                                )}
                            </Stack>

                            {/* AI explanation */}
                            {explanation && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.5,
                                        bgcolor: alpha(theme.palette.info.main, 0.05),
                                        border: "1px solid",
                                        borderColor: alpha(theme.palette.info.main, 0.15),
                                        borderRadius: 1.5,
                                        mb: 1.5,
                                        display: "flex",
                                        gap: 1,
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <LightbulbIcon sx={{ fontSize: 16, color: "info.main", mt: 0.2, flexShrink: 0 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        {explanation}
                                    </Typography>
                                </Paper>
                            )}

                            {/* Key strengths */}
                            {keyStrengths && keyStrengths.length > 0 && (
                                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                    {keyStrengths.map((s) => (
                                        <Chip key={s} label={s} size="small" variant="outlined" sx={{ fontSize: "0.72rem" }} />
                                    ))}
                                </Stack>
                            )}
                        </Box>

                        {/* Score */}
                        <Box sx={{ textAlign: "center", flexShrink: 0, minWidth: 60 }}>
                            {mode === "rag" ? (
                                <>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                                        {score.toFixed(1)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">/10</Typography>
                                </>
                            ) : (
                                <>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1 }}>
                                        {Math.round(score * 100)}%
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">match</Typography>
                                </>
                            )}
                        </Box>
                    </Stack>
                </CardContent>
            </CardActionArea>
        </Card>
    );
}
