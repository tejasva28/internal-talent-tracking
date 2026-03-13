"use client";

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Stack,
  useTheme,
  alpha,
  Avatar,
} from "@mui/material";
import { useRouter, usePathname } from "next/navigation";
import { clearToken } from "@/lib/auth";
import LogoutIcon from "@mui/icons-material/Logout";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import SearchIcon from "@mui/icons-material/Search";
import PeopleIcon from "@mui/icons-material/People";

export default function TopBar({ title }: { title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();

  const navActive = (path: string) =>
    pathname?.startsWith(path)
      ? {
        color: "primary.main",
        bgcolor: alpha(theme.palette.primary.main, 0.08),
      }
      : {};

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: alpha("#ffffff", 0.95),
        borderBottom: "1px solid",
        borderColor: "grey.200",
        backdropFilter: "blur(8px)",
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 70 } }}>
          {/* Brand/Logo */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ cursor: "pointer" }}
            onClick={() => router.push("/candidates")}
          >
            <Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
              <BusinessCenterIcon />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, color: "text.primary", letterSpacing: "-0.5px", lineHeight: 1.2 }}
              >
                {title}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontSize: "0.7rem", letterSpacing: "0.5px", textTransform: "uppercase" }}
              >
                Niche TalentDB
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          {/* Navigation */}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mr: 2 }}>
            <Button
              startIcon={<PeopleIcon />}
              onClick={() => router.push("/candidates")}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                color: "text.primary",
                px: 2,
                ...navActive("/candidates"),
              }}
            >
              Candidates
            </Button>
            <Button
              startIcon={<SearchIcon />}
              onClick={() => router.push("/search")}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                color: "text.primary",
                px: 2,
                ...navActive("/search"),
              }}
            >
              AI Search
            </Button>
          </Stack>

          {/* Logout */}
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={() => {
              clearToken();
              router.replace("/login");
            }}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              borderColor: "grey.300",
              color: "text.primary",
              px: 2.5,
              "&:hover": {
                borderColor: "error.main",
                color: "error.main",
                bgcolor: alpha(theme.palette.error.main, 0.04),
              },
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
