import { useState, useEffect } from "react";
import {
    Box,
    Button,
    Chip,
    FormControlLabel,
    Paper,
    Stack,
    Switch,
    TextField,
    Typography,
    CircularProgress,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import SaveIcon from "@mui/icons-material/Save";

interface CandidateAvailability {
    immediatelyAvailable?: boolean;
    noticePeriodDays?: number;
    isPriority?: boolean;
}

interface AvailabilityUIProps {
    candidate?: CandidateAvailability | null;
    onSave: (data: { immediatelyAvailable: boolean; noticePeriodDays: number; isPriority: boolean }) => Promise<void>;
}

export default function AvailabilityUI({
    candidate,
    onSave,
}: AvailabilityUIProps) {
    // Local state to manage form
    const [immediatelyAvailable, setImmediatelyAvailable] = useState(false);
    const [noticePeriodDays, setNoticePeriodDays] = useState(30);
    const [isPriority, setIsPriority] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize from candidate prop
    useEffect(() => {
        if (candidate) {
            setImmediatelyAvailable(candidate.immediatelyAvailable || false);
            setNoticePeriodDays(candidate.noticePeriodDays || 30);
            setIsPriority(candidate.isPriority || false);
        }
    }, [candidate]);

    // Track changes
    useEffect(() => {
        const changed =
            immediatelyAvailable !== (candidate?.immediatelyAvailable || false) ||
            noticePeriodDays !== (candidate?.noticePeriodDays || 30) ||
            isPriority !== (candidate?.isPriority || false);
        setHasChanges(changed);
    }, [immediatelyAvailable, noticePeriodDays, isPriority, candidate]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({
                immediatelyAvailable,
                noticePeriodDays,
                isPriority,
            });
            setHasChanges(false);
        } catch (error) {
            console.error("Failed to save:", error);
        } finally {
            setSaving(false);
        }
    };

    // Calculate days until candidate can join
    const daysUntilAvailable = immediatelyAvailable ? 0 : noticePeriodDays;

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Stack spacing={3}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Availability & Priority
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        size="small"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </Box>

                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={3}
                    alignItems="flex-start"
                >
                    {/* Immediate Availability Toggle */}
                    <Box sx={{ flex: 1 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={immediatelyAvailable}
                                    onChange={(e) => setImmediatelyAvailable(e.target.checked)}
                                    color="success"
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                        Available to Join Immediately
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Can start without notice period
                                    </Typography>
                                </Box>
                            }
                        />
                    </Box>

                    {/* Notice Period */}
                    {!immediatelyAvailable && (
                        <Box sx={{ flex: 1 }}>
                            <TextField
                                label="Notice Period (Days)"
                                type="number"
                                size="small"
                                value={noticePeriodDays}
                                onChange={(e) => setNoticePeriodDays(Math.max(0, parseInt(e.target.value) || 0))}
                                InputProps={{ inputProps: { min: 0, max: 365 } }}
                                fullWidth
                                helperText="Days until candidate can join"
                            />
                        </Box>
                    )}

                    {/* Priority Star */}
                    <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                        <Button
                            variant={isPriority ? "contained" : "outlined"}
                            color="warning"
                            size="large"
                            startIcon={isPriority ? <StarIcon /> : <StarBorderIcon />}
                            onClick={() => setIsPriority(!isPriority)}
                            fullWidth
                        >
                            {isPriority ? "Priority Candidate" : "Mark as Priority"}
                        </Button>
                    </Box>
                </Stack>

                {/* Status Summary */}
                <Box sx={{ bgcolor: "background.default", p: 2, borderRadius: 1 }}>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Chip
                            label={
                                immediatelyAvailable
                                    ? "✓ Available Immediately"
                                    : daysUntilAvailable === 1
                                        ? "Can join in 1 day"
                                        : `Can join in ${daysUntilAvailable} days`
                            }
                            color={immediatelyAvailable ? "success" : "default"}
                            variant={immediatelyAvailable ? "filled" : "outlined"}
                        />
                        {isPriority && (
                            <Chip
                                icon={<StarIcon />}
                                label="Priority"
                                color="warning"
                                variant="filled"
                            />
                        )}
                        {hasChanges && (
                            <Chip
                                label="Unsaved Changes"
                                color="info"
                                size="small"
                                variant="outlined"
                            />
                        )}
                    </Stack>
                </Box>
            </Stack>
        </Paper>
    );
}
