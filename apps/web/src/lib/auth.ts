export const TOKEN_KEY = "ntdb_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

type JwtPayload = {
  role?: "ADMIN" | "VIEWER" | string;
};

function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function getRoleFromToken(): "ADMIN" | "VIEWER" | null {
  const token = getToken();
  if (!token) return null;
  const payload = parseJwtPayload(token);
  const role = payload?.role;
  if (role === "ADMIN" || role === "VIEWER") return role;
  return null;
}
