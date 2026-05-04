import { useState } from "react";
import { API } from "../api";
import "./HomePage.css";

const DEMO_MESSAGES = [
  { side: "left",  original: "¿Cómo estás?",                   translated: "How are you?",              lang: "ES" },
  { side: "right", original: "I'm doing great, thanks!",        translated: "¡Estoy muy bien, gracias!", lang: "EN" },
  { side: "left",  original: "Me alegra escuchar eso.",         translated: "Glad to hear that.",        lang: "ES" },
  { side: "right", original: "What are you up to today?",       translated: "¿Qué haces hoy?",          lang: "EN" },
];

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");

      const magicToken =
        data.magic_token ||
        (data.verify_url
          ? new URL(data.verify_url).searchParams.get("token")
          : null);
      if (magicToken) {
        window.location.href = `${API}/auth/verify?token=${encodeURIComponent(magicToken)}`;
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hp-root">
      {/* Nav */}
      <nav className="hp-nav">
        <div className="hp-logo">UChat</div>
        <button className="hp-nav-btn" onClick={() => document.getElementById("login-section").scrollIntoView({ behavior: "smooth" })}>
          Sign in
        </button>
      </nav>

      {/* Hero */}
      <section className="hp-hero">
        <div className="hp-badge">
          <span className="hp-badge-dot" />
          No account needed — just your email
        </div>
        <h1 className="hp-headline">
          Chat in your language.<br />They read it in theirs.
        </h1>
        <p className="hp-subhead">
          Like WhatsApp — but the language barrier disappears instantly.
        </p>
        <button className="hp-cta" onClick={() => document.getElementById("login-section").scrollIntoView({ behavior: "smooth" })}>
          Start chatting
        </button>
        <p className="hp-micro">Takes under 10 seconds</p>
      </section>

      {/* Demo */}
      <section className="hp-demo-section">
        <p className="hp-demo-label">See how it works</p>
        <div className="hp-demo-chat">
          {DEMO_MESSAGES.map((m, i) => (
            <div key={i} className={`hp-demo-row hp-demo-row--${m.side}`}>
              {m.side === "left" && <div className="hp-avatar">M</div>}
              <div className={`hp-bubble hp-bubble--${m.side}`}>
                <div className="hp-bubble-original">{m.original}</div>
                <div className="hp-bubble-translated">{m.translated}</div>
              </div>
              {m.side === "right" && <div className="hp-avatar hp-avatar--you">Y</div>}
            </div>
          ))}
        </div>
        <div className="hp-demo-legend">
          <div className="hp-legend-item"><span className="hp-legend-label">Maria types in</span><strong>Spanish</strong></div>
          <div className="hp-legend-divider" />
          <div className="hp-legend-item"><span className="hp-legend-label">You read in</span><strong>English</strong></div>
          <div className="hp-legend-divider" />
          <div className="hp-legend-item"><span className="hp-legend-label">Translation</span><strong className="hp-legend-green">Instant</strong></div>
        </div>
      </section>

      {/* Features */}
      <section className="hp-features">
        <div className="hp-feature">
          <div className="hp-feature-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div className="hp-feature-title">Works instantly</div>
            <div className="hp-feature-sub">No delays, no setup</div>
          </div>
        </div>
        <div className="hp-feature">
          <div className="hp-feature-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 8l6 6 6-6"/></svg>
          </div>
          <div>
            <div className="hp-feature-title">50+ languages</div>
            <div className="hp-feature-sub">Powered by GPT-4o</div>
          </div>
        </div>
        <div className="hp-feature">
          <div className="hp-feature-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.89 12a19.79 19.79 0 01-3.07-8.67A2 2 0 013.82 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 8.91a16 16 0 006 6l.97-.97a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          </div>
          <div>
            <div className="hp-feature-title">Invite via WhatsApp</div>
            <div className="hp-feature-sub">If they're not on yet</div>
          </div>
        </div>
      </section>

      {/* Login */}
      <section className="hp-login-section" id="login-section">
        <div className="hp-login-card">
          {sent ? (
            <div className="hp-sent">
              <div className="hp-sent-icon">✓</div>
              <h2>Check your console</h2>
              <p>In dev mode, your magic link is printed to the server console. Click it to sign in.</p>
              <button className="hp-ghost-btn" onClick={() => setSent(false)}>Use a different email</button>
            </div>
          ) : (
            <>
              <h2 className="hp-login-title">Get started free</h2>
              <p className="hp-login-sub">Enter your email — we'll send a magic link.</p>
              <form className="hp-login-form" onSubmit={handleLogin}>
                <input
                  type="email"
                  className="hp-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <button type="submit" className="hp-cta hp-cta--full" disabled={loading}>
                  {loading ? "Sending…" : "Send magic link"}
                </button>
              </form>
              {error && <p className="hp-error">{error}</p>}
            </>
          )}
        </div>
      </section>

      <footer className="hp-footer">
        <p>UChat — breaking language barriers, one message at a time.</p>
      </footer>
    </div>
  );
}
