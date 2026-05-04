import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createInvite,
  exchangeMagicForAccess,
  fetchHistory,
  fetchMe,
  fetchUserById,
  lookupUser,
  updateLanguage,
} from "../api";
import {
  generateWhatsAppLink,
  INVITE_PENDING_PEER_KEY,
  openWhatsAppShare,
} from "../utils/invite";
import { wsUrlForUser } from "../config";
import { ChatWindow } from "../components/ChatWindow";
import { LanguageSelector } from "../components/LanguageSelector";
import { MessageInput } from "../components/MessageInput";
import type { ChatMessage, User } from "../types";
import { clearToken, getToken, setToken } from "../auth";

export function ChatPage() {
  const navigate = useNavigate();
  /** Session bootstrap finished (URL magic or access token → storage, URL cleaned). */
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("token");
      if (urlToken) {
        const raw = decodeURIComponent(urlToken);
        try {
          const access = await exchangeMagicForAccess(raw);
          if (!cancelled) setToken(access);
        } catch {
          /* invalid / expired token or network — leave storage unchanged */
        }
        const u = new URL(window.location.href);
        u.searchParams.delete("token");
        const path = u.pathname + (u.search ? u.search : "") + u.hash;
        window.history.replaceState(null, document.title, path);
      }
      if (!cancelled) setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [me, setMe] = useState<User | null>(null);
  const [peerEmail, setPeerEmail] = useState("");
  const [peer, setPeer] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const wsStoppedRef = useRef(false);
  const wsReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsUserIdRef = useRef<number | null>(null);
  const peerRef = useRef<User | null>(null);
  const typingSendRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);

  const connectWs = useCallback((userId: number) => {
    const token = getToken();
    if (!token) return;

    const cur = wsRef.current;
    if (cur && cur.readyState === WebSocket.OPEN) return;
    if (cur && cur.readyState === WebSocket.CONNECTING) return;

    if (wsReconnectTimerRef.current) {
      clearTimeout(wsReconnectTimerRef.current);
      wsReconnectTimerRef.current = null;
    }

    cur?.close();

    wsUserIdRef.current = userId;
    const url = wsUrlForUser(userId, token);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("WS connected");
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as {
          type: string;
          message?: ChatMessage;
          sender_id?: number;
        };
        if (data.type === "message" && data.message) {
          const m = data.message;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          });
          return;
        }
        if (data.type === "typing" && data.sender_id != null) {
          const currentPeer = peerRef.current;
          if (currentPeer && data.sender_id === currentPeer.id) {
            setPeerTyping(true);
            if (typingHideRef.current) clearTimeout(typingHideRef.current);
            typingHideRef.current = setTimeout(() => setPeerTyping(false), 2500);
          }
        }
      } catch {
        /* ignore */
      }
    };

    ws.onerror = (ev) => {
      console.error("WS error", ev);
      setError("Couldn’t stay connected. Check your internet and try refreshing.");
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      if (wsStoppedRef.current) return;
      const uid = wsUserIdRef.current;
      if (uid == null || !getToken()) return;
      wsReconnectTimerRef.current = setTimeout(() => {
        wsReconnectTimerRef.current = null;
        connectWs(uid);
      }, 2000);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const t = getToken();
    if (!t) {
      navigate("/login", { replace: true });
      return;
    }
    let cancelled = false;
    wsStoppedRef.current = false;
    (async () => {
      try {
        const u = await fetchMe(t);
        if (cancelled) return;
        setMe(u);
        if (!getToken()) return;
        connectWs(u.id);
      } catch {
        clearToken();
        navigate("/login", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
      wsStoppedRef.current = true;
      if (wsReconnectTimerRef.current) {
        clearTimeout(wsReconnectTimerRef.current);
        wsReconnectTimerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [authReady, navigate, connectWs]);

  useEffect(() => {
    if (!authReady || !me) return;
    const t = getToken();
    if (!t) return;
    const raw = sessionStorage.getItem(INVITE_PENDING_PEER_KEY);
    if (!raw) return;
    const peerId = parseInt(raw, 10);
    if (Number.isNaN(peerId) || peerId === me.id) {
      sessionStorage.removeItem(INVITE_PENDING_PEER_KEY);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchUserById(t, peerId);
        if (cancelled) return;
        sessionStorage.removeItem(INVITE_PENDING_PEER_KEY);
        setPeer(p);
        setPeerEmail(p.email);
        setMessages([]);
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem(INVITE_PENDING_PEER_KEY);
          setError("We couldn’t open that conversation. Try again or ask for a new link.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, me]);

  useEffect(() => {
    if (!authReady || !me || !peer) return;
    const t = getToken();
    if (!t) return;
    let cancelled = false;
    (async () => {
      try {
        const hist = await fetchHistory(t, peer.id);
        if (!cancelled) setMessages(hist);
      } catch {
        if (!cancelled) setError("Couldn’t load messages. Try again in a moment.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, me, peer?.id]);

  const onPeerConnect = async () => {
    setError(null);
    const t = getToken();
    if (!t) return;
    try {
      const p = await lookupUser(t, peerEmail.trim());
      setPeer(p);
      setMessages([]);
    } catch {
      setError(
        "No one here with that email yet. They need to join once with the same email."
      );
    }
  };

  const sendMessage = (text: string) => {
    if (!peer || !me) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError("You’re offline. Refresh the page and try again.");
      return;
    }
    ws.send(
      JSON.stringify({
        type: "message",
        receiver_id: peer.id,
        text,
      })
    );
  };

  const sendTypingDebounced = () => {
    if (!peer) return;
    if (typingSendRef.current) return;
    typingSendRef.current = setTimeout(() => {
      typingSendRef.current = null;
    }, 1200);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({ type: "typing", receiver_id: peer.id })
      );
    }
  };

  const onLanguageChange = async (code: string) => {
    const t = getToken();
    if (!t || !me) return;
    try {
      const u = await updateLanguage(t, code);
      setMe(u);
    } catch {
      setError("Couldn’t save your language. Try again.");
    }
  };

  const shareViaWhatsApp = async () => {
    const t = getToken();
    if (!t) return;
    setError(null);
    try {
      const { invite_link } = await createInvite(t);
      const whatsappUrl = generateWhatsAppLink(invite_link);
      openWhatsAppShare(whatsappUrl);
    } catch {
      setError("Couldn’t create a share link. Try again.");
    }
  };

  if (!authReady) {
    return (
      <div className="px-5 py-8 text-white">
        Initializing session…
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-gray-400">
        One moment…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-800 bg-chat-panel px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-white">UChat</h1>
          <p className="truncate text-xs text-gray-400">{me.email}</p>
        </div>
        <LanguageSelector
          value={me.preferred_language}
          onChange={onLanguageChange}
        />
        <button
          type="button"
          onClick={() => {
            clearToken();
            navigate("/", { replace: true });
          }}
          className="text-sm text-gray-400 underline hover:text-white"
        >
          Sign out
        </button>
      </header>

      <div className="flex flex-shrink-0 flex-wrap items-end gap-2 border-b border-gray-800 bg-chat-bg px-4 py-3">
        <input
          type="email"
          placeholder="Enter email or phone"
          className="min-w-[200px] flex-1 rounded-xl border border-gray-700 bg-chat-panel px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-chat-accent focus:outline-none"
          value={peerEmail}
          onChange={(e) => setPeerEmail(e.target.value)}
        />
        <button
          type="button"
          onClick={onPeerConnect}
          className="rounded-xl bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
        >
          Open conversation
        </button>
      </div>

      {error && (
        <p className="flex-shrink-0 bg-red-950/50 px-4 py-2 text-center text-sm text-red-300">
          {error}
        </p>
      )}

      {!peer ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center text-gray-500">
          <p className="max-w-sm text-gray-400">
            Add someone’s email above, then tap{" "}
            <span className="text-gray-300">Open conversation</span>. Or share an
            invite link below.
          </p>
          <button
            type="button"
            title="Invite someone to chat instantly"
            onClick={shareViaWhatsApp}
            className="rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow hover:opacity-95"
          >
            Share via WhatsApp
          </button>
        </div>
      ) : (
        <>
          <div className="flex-shrink-0 border-b border-gray-800 px-4 py-2">
            <p className="text-sm font-medium text-gray-200">Conversation</p>
            <p className="truncate text-xs text-gray-500">{peer.email}</p>
          </div>
          <ChatWindow
            messages={messages}
            selfId={me.id}
            peerTyping={peerTyping}
          />
          <div className="flex-shrink-0 border-t border-gray-800 bg-chat-panel px-3 py-2">
            <button
              type="button"
              title="Invite someone to chat instantly"
              onClick={shareViaWhatsApp}
              className="w-full rounded-full bg-[#25D366] py-2.5 text-sm font-semibold text-white shadow hover:opacity-95 sm:w-auto sm:px-6"
            >
              Share via WhatsApp
            </button>
          </div>
          <MessageInput
            onSend={sendMessage}
            onTyping={sendTypingDebounced}
            disabled={!peer}
          />
        </>
      )}
    </div>
  );
}
