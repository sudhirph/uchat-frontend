import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { acceptInviteToken } from "../api";
import { getToken } from "../auth";
import { INVITE_PENDING_PEER_KEY } from "../utils/invite";

export function InvitePage() {
  const params = useParams<{ token?: string }>();
  const tokenParam = params?.token;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inviterUserId, setInviterUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenParam) {
      setLoading(false);
      setError("Missing invite token.");
      return;
    }

    let raw = tokenParam;
    try {
      raw = decodeURIComponent(tokenParam);
    } catch {
      raw = tokenParam;
    }

    let cancelled = false;
    (async () => {
      try {
        const accepted = await acceptInviteToken(raw);
        const inviter_user_id = accepted?.inviter_user_id;
        if (cancelled || inviter_user_id == null) return;
        sessionStorage.setItem(INVITE_PENDING_PEER_KEY, String(inviter_user_id));
        setInviterUserId(inviter_user_id);
      } catch {
        if (!cancelled) {
          setError("This link doesn’t work anymore. Ask your friend to send a new one.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenParam]);

  const hasSession = Boolean(getToken());

  if (loading) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center text-gray-400">
        Validating invite...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 text-center">
        <p className="text-red-400">{error}</p>
        <button
          type="button"
          className="mt-6 text-chat-accent underline"
          onClick={() => navigate("/", { replace: true })}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 text-center text-gray-300">
      <h1 className="text-lg font-semibold text-white">Invite is valid</h1>
      <p className="mt-2 text-sm">
        inviter_user_id: {inviterUserId ?? "unknown"}
      </p>
      <p className="mt-1 text-sm">session: {hasSession ? "found" : "not found"}</p>
      <button
        type="button"
        className="mt-6 rounded bg-chat-accent px-4 py-2 font-medium text-chat-bg"
        onClick={() =>
          navigate(hasSession ? "/chat" : "/login?from=invite", { replace: true })
        }
      >
        Continue
      </button>
    </div>
  );
}
