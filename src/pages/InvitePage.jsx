import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API } from "../api";
import "./HomePage.css"; // reuse base styles

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | valid | invalid
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Validate invite token
    fetch(`${API}/invite/accept?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => setStatus("valid"))
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function handleJoin(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");

      // Dev: follow magic link directly
      if (data.verify_url) {
        const url = new URL(data.verify_url);
        const magicToken = url.searchParams.get("token");
        if (magicToken) {
          const vRes = await fetch(`${API}/auth/verify?token=${encodeURIComponent(magicToken)}`);
          if (vRes.redirected) {
            const rUrl = new URL(vRes.url);
            const accessToken = rUrl.searchParams.get("token");
            if (accessToken) {
              localStorage.setItem("uchat_token", accessToken);
              navigate("/chat");
              return;
            }
          }
        }
      }
      navigate("/chat");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="hp-root" style={{ justifyContent: "center", alignItems: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Validating invite…</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="hp-root" style={{ justifyContent: "center", alignItems: "center" }}>
        <div className="hp-login-card" style={{ maxWidth: 360, margin: "0 20px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h2 className="hp-login-title">Invite expired</h2>
          <p className="hp-login-sub">This invite link is no longer valid. Ask your friend to send a new one.</p>
          <button className="hp-cta hp-cta--full" style={{ marginTop: 8 }} onClick={() => navigate("/")}>Go to homepage</button>
        </div>
      </div>
    );
  }

  return (
    <div className="hp-root">
      <nav className="hp-nav">
        <div className="hp-logo">UChat</div>
      </nav>

      <section className="hp-hero" style={{ paddingTop: 40 }}>
        <div className="hp-badge">
          <span className="hp-badge-dot" />
          You've been invited
        </div>
        <h1 className="hp-headline" style={{ fontSize: "clamp(24px, 4vw, 36px)" }}>
          Chat across any language — instantly
        </h1>
        <p className="hp-subhead">
          Your friend is waiting. Enter your email to join and start chatting. Messages are automatically translated for both of you.
        </p>
      </section>

      <section className="hp-login-section">
        <div className="hp-login-card">
          <h2 className="hp-login-title">Join UChat</h2>
          <p className="hp-login-sub">Enter your email to create your free account.</p>
          <form className="hp-login-form" onSubmit={handleJoin}>
            <input
              type="email"
              className="hp-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" className="hp-cta hp-cta--full" disabled={submitting}>
              {submitting ? "Joining…" : "Join and start chatting"}
            </button>
          </form>
          {error && <p className="hp-error">{error}</p>}
        </div>
      </section>
    </div>
  );
}
