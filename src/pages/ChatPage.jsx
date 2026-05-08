import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API, wsUrl } from "../api";
import "./ChatPage.css";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "hi", label: "हिन्दी" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

function formatTime(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function initials(email) {
  return email ? email[0].toUpperCase() : "?";
}

export default function ChatPage() {
  const auth = useAuth() || {};
  const token = auth.token;
  const user = auth.user;
  const authReady = auth.authReady ?? false;
  const signOut = auth.signOut ?? (() => {});
  const updateUser = auth.updateUser ?? (() => {});
  const navigate = useNavigate();

  const [peer, setPeer] = useState(null);
  const [peerInput, setPeerInput] = useState("");
  const [peerError, setPeerError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [wsStatus, setWsStatus] = useState("disconnected"); // connected | disconnected | error
  const [typingPeer, setTypingPeer] = useState(false);
  const typingTimeout = useRef(null);
  const sendTypingTimeout = useRef(null);

  const [inviteLink, setInviteLink] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const reconnectTimer = useRef(null);

  // Redirect if not authed
  useEffect(() => {
    if (authReady && !token) navigate("/");
  }, [authReady, token]);

  // Pick up ?token from URL on load (handled by AuthContext, but also handle peer from URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const peerEmail = params.get("peer");
    if (peerEmail) lookupPeer(peerEmail);
  }, []);

  // WebSocket
  const connectWs = useCallback(() => {
    if (!user || !token) return;
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(wsUrl(user.id, token));
    wsRef.current = ws;

    ws.onopen = () => setWsStatus("connected");
    ws.onclose = () => {
      setWsStatus("disconnected");
      reconnectTimer.current = setTimeout(connectWs, 3000);
    };
    ws.onerror = () => setWsStatus("error");
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "message") {
          setMessages((prev) => {
            // deduplicate by id
            if (prev.find((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          setTypingPeer(false);
        }
        if (data.type === "typing") {
          setTypingPeer(true);
          clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setTypingPeer(false), 2500);
        }
      } catch {}
    };
  }, [user, token]);

  useEffect(() => {
    if (user && token) connectWs();
    return () => {
      if (wsRef.current) wsRef.current.close();
      clearTimeout(reconnectTimer.current);
    };
  }, [user, token]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingPeer]);

  // Fetch chat history when peer changes
  useEffect(() => {
    if (!peer || !token) return;
    fetch(`${API}/messages/${peer.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setMessages(data))
      .catch(() => {});
  }, [peer, token]);

  async function lookupPeer(emailOverride) {
    const email = (emailOverride || peerInput).trim().toLowerCase();
    if (!email) return;
    setLookingUp(true);
    setPeerError("");
    try {
      const res = await fetch(`${API}/users/lookup?email=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        setPeerError("No user found with that email.");
        setPeer(null);
        return;
      }
      if (!res.ok) throw new Error("Lookup failed");
      const u = await res.json();
      setPeer(u);
      setMessages([]);
      setPeerInput("");
      setPeerError("");
    } catch (err) {
      setPeerError(err.message || "Could not look up user.");
    } finally {
      setLookingUp(false);
    }
  }

  function sendTypingEvent() {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !peer) return;
    clearTimeout(sendTypingTimeout.current);
    wsRef.current.send(JSON.stringify({ type: "typing", receiver_id: peer.id }));
    sendTypingTimeout.current = setTimeout(() => {}, 2000);
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || !peer || sending) return;
    setSending(true);
    const payload = { type: "message", receiver_id: peer.id, text: text.trim() };
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
        setText("");
      } else {
        // fallback to REST
        const res = await fetch(`${API}/messages/send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ receiver_id: peer.id, text: text.trim() }),
        });
        if (!res.ok) throw new Error("Send failed");
        const msg = await res.json();
        setMessages((prev) => (prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]));
        setText("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  async function updateLanguage(lang) {
    try {
      const res = await fetch(`${API}/users/me`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ preferred_language: lang }),
      });
      if (res.ok) {
        const u = await res.json();
        updateUser(u);
      }
    } catch {}
  }

  async function generateInvite() {
    setInviteLoading(true);
    try {
      const res = await fetch(`${API}/invite/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setInviteLink(data.invite_link);
    } catch {}
    finally { setInviteLoading(false); }
  }

  function shareViaWhatsApp() {
    if (!inviteLink) return;
    const msg = encodeURIComponent(
      `Hey! Join me on UChat — we can chat in our own languages and it all gets translated automatically. Click here to join: ${inviteLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  if (!authReady) return <div className="cp-loading">Loading…</div>;
  if (!user) {
    return (
      <div className="cp-root">
        <div className="cp-loading" style={{ padding: "1.5rem", textAlign: "center" }}>
          <p style={{ marginBottom: "1rem", color: "rgba(255,255,255,0.75)" }}>
            {!token
              ? "Sign in required — redirecting…"
              : "Couldn’t load your profile. This link may be invalid or expired."}
          </p>
          <button type="button" className="cp-signout" onClick={() => navigate("/")}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const myLang = LANGUAGES.find((l) => l.code === user.preferred_language) || LANGUAGES[0];

  return (
    <div className="cp-root">
      {/* Header */}
      <header className="cp-header">
        <div className="cp-logo">UChat</div>
        <div className="cp-header-center">
          <div className={`cp-ws-dot cp-ws-dot--${wsStatus}`} title={wsStatus} />
          <select
            className="cp-lang-select"
            value={user.preferred_language}
            onChange={(e) => updateLanguage(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
        <button className="cp-signout" onClick={signOut}>Sign out</button>
      </header>

      {/* Peer lookup bar */}
      <div className="cp-lookup-bar">
        <input
          className="cp-lookup-input"
          type="email"
          placeholder="Enter their email to start chatting…"
          value={peerInput}
          onChange={(e) => setPeerInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookupPeer()}
        />
        <button className="cp-lookup-btn" onClick={() => lookupPeer()} disabled={lookingUp}>
          {lookingUp ? "…" : "Open conversation"}
        </button>
      </div>
      {peerError && <div className="cp-peer-error">{peerError}</div>}

      {/* Main area */}
      <div className="cp-main">
        {!peer ? (
          <div className="cp-empty">
            <div className="cp-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <h3>Start a conversation</h3>
            <p>Enter someone's email above to chat — messages are automatically translated.</p>
            <div className="cp-empty-divider">
              <span>or invite someone new</span>
            </div>
            <div className="cp-invite-area">
              {!inviteLink ? (
                <button className="cp-invite-btn" onClick={generateInvite} disabled={inviteLoading}>
                  {inviteLoading ? "Generating…" : "Generate invite link"}
                </button>
              ) : (
                <div className="cp-invite-generated">
                  <div className="cp-invite-link-box">
                    <input className="cp-invite-link-input" value={inviteLink} readOnly />
                    <button className="cp-copy-btn" onClick={() => navigator.clipboard.writeText(inviteLink)}>Copy</button>
                  </div>
                  <button className="cp-wa-btn" onClick={shareViaWhatsApp}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Share via WhatsApp
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Peer header */}
            <div className="cp-peer-header">
              <div className="cp-peer-avatar">{initials(peer.email)}</div>
              <div>
                <div className="cp-peer-email">{peer.email}</div>
                <div className="cp-peer-lang">
                  Typing in {LANGUAGES.find(l => l.code === peer.preferred_language)?.label || peer.preferred_language}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="cp-messages">
              {messages.length === 0 && (
                <div className="cp-no-msgs">No messages yet. Say hello!</div>
              )}
              {messages.map((msg) => {
                const mine = msg.sender_id === user.id;
                return (
                  <div key={msg.id} className={`cp-msg-row cp-msg-row--${mine ? "mine" : "theirs"}`}>
                    {!mine && <div className="cp-msg-avatar">{initials(peer.email)}</div>}
                    <div className={`cp-bubble cp-bubble--${mine ? "mine" : "theirs"}`}>
                      <div className="cp-bubble-text">{mine ? msg.original_text : (msg.translated_text || msg.original_text)}</div>
                      {mine && msg.translated_text && (
                        <div className="cp-bubble-translation">{msg.translated_text}</div>
                      )}
                      {!mine && msg.original_text && msg.translated_text && (
                        <div className="cp-bubble-translation">{msg.original_text}</div>
                      )}
                      <div className="cp-bubble-time">{formatTime(msg.created_at)}</div>
                    </div>
                  </div>
                );
              })}

              {typingPeer && (
                <div className="cp-msg-row cp-msg-row--theirs">
                  <div className="cp-msg-avatar">{initials(peer.email)}</div>
                  <div className="cp-typing-indicator">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form className="cp-input-bar" onSubmit={sendMessage}>
              <input
                className="cp-msg-input"
                placeholder={`Write in ${myLang.label}…`}
                value={text}
                onChange={(e) => { setText(e.target.value); sendTypingEvent(); }}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(e)}
                autoFocus
              />
              <button type="submit" className="cp-send-btn" disabled={sending || !text.trim()}>
                Send
              </button>
            </form>

            {/* Invite footer inside chat */}
            <div className="cp-chat-invite-footer">
              <span>Not on UChat yet?</span>
              {!inviteLink ? (
                <button className="cp-chat-invite-link" onClick={generateInvite}>Generate invite link</button>
              ) : (
                <button className="cp-chat-invite-link" onClick={shareViaWhatsApp}>Share via WhatsApp</button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Connection banner */}
      {wsStatus !== "connected" && (
        <div className="cp-connection-banner">
          {wsStatus === "disconnected" ? "Reconnecting…" : "Connection error — check your internet."}
        </div>
      )}
    </div>
  );
}
