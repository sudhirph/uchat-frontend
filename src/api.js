const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
export const API = BASE.replace(/\/$/, "");

export function wsUrl(userId, token) {
  const ws = API.replace(/^http/, "ws");
  return `${ws}/ws/chat/${userId}?token=${encodeURIComponent(token)}`;
}
