const raw = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const API_BASE_URL = raw.replace(/\/$/, "");

export function wsUrlForUser(userId: number, token: string): string {
  const base = API_BASE_URL.replace(/^http/, "ws");
  const q = new URLSearchParams({ token });
  return `${base}/ws/chat/${userId}?${q.toString()}`;
}
