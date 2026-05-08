import { API_BASE_URL } from "./config";
import type { ChatMessage, User } from "./types";

/** Avoid ngrok free-tier HTML interstitial on programmatic fetches. */
const NGROK_SKIP_BROWSER_WARNING = { "ngrok-skip-browser-warning": "true" } as const;

const DEFAULT_FETCH_TIMEOUT_MS = 15_000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const outer = init.signal;
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

async function responseJson<T>(r: Response): Promise<T | null> {
  try {
    const text = await r.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function parseUser(data: unknown): User {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Session expired");
  }
  const u = data as Record<string, unknown>;
  if (
    typeof u.id !== "number" ||
    typeof u.email !== "string" ||
    typeof u.preferred_language !== "string"
  ) {
    throw new Error("Session expired");
  }
  return { id: u.id, email: u.email, preferred_language: u.preferred_language };
}

function authHeaders(token: string): HeadersInit {
  return {
    ...NGROK_SKIP_BROWSER_WARNING,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export type LoginResponse = {
  message: string;
  verify_url: string;
  magic_token?: string;
  token?: string;
};

export async function loginRequest(email: string): Promise<LoginResponse> {
  const r = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      ...NGROK_SKIP_BROWSER_WARNING,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) {
    const body = await responseJson<unknown>(r);
    console.error("POST /auth/login failed", r.status, body);
    throw new Error("Login failed");
  }
  const data = await responseJson<unknown>(r);
  if (data == null || typeof data !== "object") throw new Error("Login failed");
  return data as LoginResponse;
}

/** Exchange magic-link JWT for access JWT (used when /chat?token= is a magic token). */
export async function exchangeMagicForAccess(magicToken: string): Promise<string> {
  const r = await fetchWithTimeout(`${API_BASE_URL}/auth/exchange-magic`, {
    method: "POST",
    headers: {
      ...NGROK_SKIP_BROWSER_WARNING,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: magicToken }),
  });
  if (!r.ok) {
    const body = await responseJson<unknown>(r);
    console.error("POST /auth/exchange-magic failed", r.status, body);
    throw new Error("Magic exchange failed");
  }
  const data = await responseJson<{ access_token?: string }>(r);
  const access = data?.access_token;
  if (typeof access !== "string" || !access) throw new Error("Magic exchange failed");
  return access;
}

export async function fetchMe(token: string): Promise<User> {
  const r = await fetchWithTimeout(`${API_BASE_URL}/users/me`, {
    headers: authHeaders(token),
  });
  if (!r.ok) throw new Error("Session expired");
  const data = await responseJson<unknown>(r);
  return parseUser(data);
}

export async function updateLanguage(token: string, preferred_language: string) {
  const r = await fetchWithTimeout(`${API_BASE_URL}/users/me`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ preferred_language }),
  });
  if (!r.ok) throw new Error("Could not update language");
  const data = await responseJson<unknown>(r);
  return parseUser(data);
}

export async function lookupUser(token: string, email: string): Promise<User> {
  const r = await fetchWithTimeout(
    `${API_BASE_URL}/users/lookup?email=${encodeURIComponent(email)}`,
    { headers: authHeaders(token) }
  );
  if (!r.ok) throw new Error("User not found");
  const data = await responseJson<unknown>(r);
  return parseUser(data);
}

export async function fetchHistory(
  token: string,
  otherUserId: number
): Promise<ChatMessage[]> {
  const r = await fetchWithTimeout(`${API_BASE_URL}/messages/${otherUserId}`, {
    headers: authHeaders(token),
  });
  if (!r.ok) throw new Error("Could not load messages");
  const data = await responseJson<unknown>(r);
  if (!Array.isArray(data)) throw new Error("Could not load messages");
  return data as ChatMessage[];
}

export async function createInvite(token: string): Promise<{ invite_link: string }> {
  const r = await fetchWithTimeout(`${API_BASE_URL}/invite/create`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!r.ok) {
    const err = (await responseJson<{ detail?: string }>(r)) ?? {};
    throw new Error(err.detail || "Could not create invite");
  }
  const data = await responseJson<{ invite_link?: string }>(r);
  if (!data?.invite_link) throw new Error("Could not create invite");
  return { invite_link: data.invite_link };
}

export async function acceptInviteToken(
  inviteToken: string
): Promise<{ inviter_user_id: number }> {
  const r = await fetchWithTimeout(
    `${API_BASE_URL}/invite/accept?token=${encodeURIComponent(inviteToken)}`,
    { headers: { ...NGROK_SKIP_BROWSER_WARNING } }
  );
  if (!r.ok) {
    const err = (await responseJson<{ detail?: string }>(r)) ?? {};
    throw new Error(err.detail || "Invalid invite");
  }
  const data = await responseJson<{ inviter_user_id?: number }>(r);
  if (data?.inviter_user_id == null) throw new Error("Invalid invite");
  return { inviter_user_id: data.inviter_user_id };
}

export async function fetchUserById(
  token: string,
  userId: number
): Promise<User> {
  const r = await fetchWithTimeout(`${API_BASE_URL}/users/by-id/${userId}`, {
    headers: authHeaders(token),
  });
  if (!r.ok) throw new Error("User not found");
  const data = await responseJson<unknown>(r);
  return parseUser(data);
}
