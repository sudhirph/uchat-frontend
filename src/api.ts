import { API_BASE_URL } from "./config";
import type { ChatMessage, User } from "./types";

/** Avoid ngrok free-tier HTML interstitial on programmatic fetches. */
const NGROK_SKIP_BROWSER_WARNING = { "ngrok-skip-browser-warning": "true" } as const;

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
  const r = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      ...NGROK_SKIP_BROWSER_WARNING,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    console.error("POST /auth/login failed", r.status, body);
    throw new Error("Login failed");
  }
  return r.json() as Promise<LoginResponse>;
}

/** Exchange magic-link JWT for access JWT (used when /chat?token= is a magic token). */
export async function exchangeMagicForAccess(magicToken: string): Promise<string> {
  const r = await fetch(`${API_BASE_URL}/auth/exchange-magic`, {
    method: "POST",
    headers: {
      ...NGROK_SKIP_BROWSER_WARNING,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: magicToken }),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    console.error("POST /auth/exchange-magic failed", r.status, body);
    throw new Error("Magic exchange failed");
  }
  const data = (await r.json().catch(() => null)) as { access_token?: string } | null;
  const access = data?.access_token;
  if (!access) throw new Error("Magic exchange failed");
  return access;
}

export async function fetchMe(token: string): Promise<User> {
  const r = await fetch(`${API_BASE_URL}/users/me`, {
    headers: authHeaders(token),
  });
  if (!r.ok) throw new Error("Session expired");
  return r.json();
}

export async function updateLanguage(token: string, preferred_language: string) {
  const r = await fetch(`${API_BASE_URL}/users/me`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ preferred_language }),
  });
  if (!r.ok) throw new Error("Could not update language");
  return r.json() as Promise<User>;
}

export async function lookupUser(token: string, email: string): Promise<User> {
  const r = await fetch(
    `${API_BASE_URL}/users/lookup?email=${encodeURIComponent(email)}`,
    { headers: authHeaders(token) }
  );
  if (!r.ok) throw new Error("User not found");
  return r.json();
}

export async function fetchHistory(
  token: string,
  otherUserId: number
): Promise<ChatMessage[]> {
  const r = await fetch(`${API_BASE_URL}/messages/${otherUserId}`, {
    headers: authHeaders(token),
  });
  if (!r.ok) throw new Error("Could not load messages");
  return r.json();
}

export async function createInvite(token: string): Promise<{ invite_link: string }> {
  const r = await fetch(`${API_BASE_URL}/invite/create`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "Could not create invite");
  }
  const data = (await r.json().catch(() => null)) as { invite_link?: string } | null;
  if (!data?.invite_link) throw new Error("Could not create invite");
  return { invite_link: data.invite_link };
}

export async function acceptInviteToken(
  inviteToken: string
): Promise<{ inviter_user_id: number }> {
  const r = await fetch(
    `${API_BASE_URL}/invite/accept?token=${encodeURIComponent(inviteToken)}`,
    { headers: { ...NGROK_SKIP_BROWSER_WARNING } }
  );
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "Invalid invite");
  }
  const data = (await r.json().catch(() => null)) as { inviter_user_id?: number } | null;
  if (data?.inviter_user_id == null) throw new Error("Invalid invite");
  return { inviter_user_id: data.inviter_user_id };
}

export async function fetchUserById(
  token: string,
  userId: number
): Promise<User> {
  const r = await fetch(`${API_BASE_URL}/users/by-id/${userId}`, {
    headers: authHeaders(token),
  });
  if (!r.ok) throw new Error("User not found");
  return r.json();
}
