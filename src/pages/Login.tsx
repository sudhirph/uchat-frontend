import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { loginRequest } from "../api";
import { API_BASE_URL } from "../config";

export function LoginPage() {
  const [params] = useSearchParams();
  const fromInvite = params.get("from") === "invite";
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = params.get("token");
    if (!t) return;
    window.location.href = `${API_BASE_URL}/auth/verify?token=${encodeURIComponent(t)}`;
  }, [params]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const login = await loginRequest(email.trim());
      const magicToken = login.magic_token ?? login.token;
      if (!magicToken) {
        console.error("Login response missing magic_token/token", login);
        setError("Something went wrong. Please try again.");
        return;
      }
      window.location.href = `${API_BASE_URL}/auth/verify?token=${encodeURIComponent(magicToken)}`;
    } catch (err) {
      console.error("Login flow failed", err);
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-chat-panel p-8 shadow-xl">
        <h1 className="text-center text-2xl font-semibold text-white">UChat</h1>
        <p className="mt-2 text-center text-sm text-gray-400">
          Enter your email to continue
        </p>
        {fromInvite && (
          <p className="mt-1 text-center text-xs text-gray-500">
            Sign in to continue to the conversation
          </p>
        )}
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Your email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Enter your email"
              className="w-full rounded-xl border border-gray-700 bg-chat-bg px-4 py-3 text-white placeholder:text-gray-500 focus:border-chat-accent focus:outline-none focus:ring-1 focus:ring-chat-accent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-chat-accent py-3 font-semibold text-chat-bg transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Continuing…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
