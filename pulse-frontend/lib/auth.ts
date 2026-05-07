// No "use client" — safe to import anywhere. All browser APIs are guarded by typeof window checks.

const TOKEN_KEY = "pulse_token";
const ADMIN_KEY = "pulse_admin";

export interface AdminInfo {
  admin_id: number;
  email: string;
  display_name: string | null;
  role: string;
}

export function saveAuth(token: string, admin: AdminInfo): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdmin(): AdminInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminInfo;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
