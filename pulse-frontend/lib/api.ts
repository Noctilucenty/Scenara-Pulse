import axios from "axios";
import { getToken, clearAuth } from "./auth";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      clearAuth();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────

export const login = (email: string, password: string) => {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  return api.post("/auth/token", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
};

// ── Analytics ────────────────────────────────────────────────────────────────

export const getOverview = (days = 30) =>
  api.get(`/admin/analytics/overview?days=${days}`).then((r) => r.data);

export const getUsers = (params?: Record<string, string | number>) =>
  api.get("/admin/analytics/users", { params }).then((r) => r.data);

export const getUserDetail = (id: number) =>
  api.get(`/admin/analytics/users/${id}`).then((r) => r.data);

export const toggleUserActive = (id: number) =>
  api.patch(`/admin/analytics/users/${id}/toggle-active`).then((r) => r.data);

export const addUserNote = (id: number, note: string) =>
  api.post(`/admin/analytics/users/${id}/notes`, { note }).then((r) => r.data);

export const getSessions = (params?: Record<string, number>) =>
  api.get("/admin/analytics/sessions", { params }).then((r) => r.data);

export const getMarkets = (params?: Record<string, string | number>) =>
  api.get("/admin/analytics/markets", { params }).then((r) => r.data);

export const getMarketDetail = (id: number) =>
  api.get(`/admin/analytics/markets/${id}`).then((r) => r.data);

export const getPredictions = (params?: Record<string, string | number>) =>
  api.get("/admin/analytics/predictions", { params }).then((r) => r.data);

export const getRetention = () =>
  api.get("/admin/analytics/retention").then((r) => r.data);

export const getFunnel = () =>
  api.get("/admin/analytics/funnel").then((r) => r.data);

export const getLeaderboard = (params?: Record<string, string | number>) =>
  api.get("/admin/analytics/leaderboard", { params }).then((r) => r.data);

export const getRealtime = () =>
  api.get("/admin/analytics/realtime").then((r) => r.data);

export const getDaily = (days = 90) =>
  api.get(`/admin/analytics/daily?days=${days}`).then((r) => r.data);

/**
 * Download a CSV export using fetch + Authorization header so the token
 * is never exposed in the URL or browser history.
 */
export async function downloadExport(type: "users" | "predictions" | "markets"): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BASE}/admin/analytics/export?type=${type}`, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `scenara_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(href);
}
