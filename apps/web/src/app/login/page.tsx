"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Card, CardContent, TextField, Typography, Alert } from "@mui/material";
import { api, type LoginResponse } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@local.test");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>("/api/auth/login", { email, password });
      setToken(res.data.accessToken);
      router.replace("/candidates");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <Card sx={{ width: 420 }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
            Internal Database Tracking System
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Internal dashboard login
          </Typography>

          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

          <form onSubmit={onSubmit}>
            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="normal"
              autoComplete="email"
            />
            <TextField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              fullWidth
              margin="normal"
              autoComplete="current-password"
            />
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <Typography variant="caption" sx={{ display: "block", mt: 2, color: "text.secondary" }}>
            Seeded users: admin@local.test / admin123 • viewer@local.test / viewer123
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
