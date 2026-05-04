import { createContext, useContext, useEffect, useState } from "react";
import { API } from "../api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("uchat_token"));
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // On mount, pick up ?token= from URL (magic link redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      localStorage.setItem("uchat_token", urlToken);
      setToken(urlToken);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Fetch /users/me whenever token changes
  useEffect(() => {
    if (!token) {
      setUser(null);
      setAuthReady(true);
      return;
    }
    fetch(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem("uchat_token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setAuthReady(true));
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
