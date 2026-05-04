import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { acceptInviteToken } from "../api";
import { INVITE_PENDING_PEER_KEY } from "../utils/invite";
import { TOKEN_KEY } from "../auth";

export function InvitePage() {
  const { token: tokenParam } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenParam) {
      navigate("/", { replace: true });
      return;
    }
    const raw = decodeURIComponent(tokenParam);
    let cancelled = false;
    (async () => {
      try {
        const { inviter_user_id } = await acceptInviteToken(raw);
        if (cancelled) return;
        sessionStorage.setItem(INVITE_PENDING_PEER_KEY, String(inviter_user_id));
        const hasSession = localStorage.getItem(TOKEN_KEY);
        navigate(hasSession ? "/chat" : "/login?from=invite", { replace: true });
      } catch {
        if (!cancelled) {
          setError("This link doesn’t work anymore. Ask your friend to send a new one.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenParam, navigate]);

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
    <div className="flex min-h-full flex-col items-center justify-center text-gray-400">
      Joining conversation…
    </div>
  );
}
