import { createContext, useContext, useEffect, useState } from "react";
import { API } from "../api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    // Check URL first (magic link redirect lands here with ?token=)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      localStorage.setItem("uchat_token", urlToken);
      // Clean URL immediately
      window.history.replaceState({}, "", window.location.pathname);
      return urlToken;
    }
    return localStorage.getItem("uchat_token");
  });
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Fetch /users/me whenever token changes
  useEffect(() => {
    if (!token) {
      setUser(null);
      setAuthReady(true);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    fetch(`${API}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem("uchat_token");
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        clearTimeout(timeout);
        setAuthReady(true);
      });
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [token]);

  function signOut() {
    localStorage.removeItem("uchat_token");
    setToken(null);
    setUser(null);
  }

  function updateUser(u) {
    setUser(u);
  }

  return (
    <AuthCtx.Provider value={{ token, user, authReady, signOut, updateUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
