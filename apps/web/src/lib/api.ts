import axios from "axios";
import { getToken, clearToken } from "./auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // If token expired/invalid, log out.
    if (err?.response?.status === 401) {
      clearToken();
    }
    return Promise.reject(err);
  }
);

export type LoginResponse = {
  accessToken: string;
  role: "ADMIN" | "VIEWER";
  email: string;
};

export type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  primarySkill: string;
  experienceYears: number;
  availabilityStatus: string;
  lastResumeUpdate?: string;
  immediatelyAvailable?: boolean;
  noticePeriodDays?: number;
  isPriority?: boolean;
};

export type ResumeVersion = {
  id: string;
  candidateId: string;
  originalFilename: string;
  reviewStatus: "PENDING" | "CONFIRMED" | "REJECTED";
  uploadedAt: string;
  reviewedAt?: string;
};

export type ResumeVersionDetail = {
  id: string;
  candidateId: string;
  originalFilename: string;
  mimeType?: string;
  fileSize?: number;
  reviewStatus: "PENDING" | "CONFIRMED" | "REJECTED";
  uploadedAt: string;
  reviewedAt?: string;
  parsedSnapshotJson?: string;
  reviewedSnapshotJson?: string;
  parsingConfidenceJson?: string;
  parserVersion?: string;
};

// ── RAG Search types ──────────────────────────────────────────────────────────

export type SearchResult = {
  candidate: Candidate;
  score: number;
  rank: number;
  explanation: string | null;
  keyStrengths: string[];
};

export type SearchResponse = {
  results: SearchResult[];
  total: number;
  searchSummary: string | null;
};

export async function searchCandidates(query: string, limit = 10): Promise<SearchResponse> {
  const res = await api.get<SearchResponse>("/api/search", {
    params: { q: query, limit },
  });
  return res.data;
}

export async function ragSearchCandidates(query: string, limit = 10): Promise<SearchResponse> {
  const res = await api.get<SearchResponse>("/api/search/rag", {
    params: { q: query, limit },
  });
  return res.data;
}

