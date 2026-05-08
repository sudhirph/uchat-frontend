import { createContext, useContext, useEffect, useState } from "react";
import { API } from "../api";

const TOKEN_KEY = "access_token";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");

    if (urlToken) {
      localStorage.setItem(TOKEN_KEY, urlToken);

      // remove token from URL
      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );

      return urlToken;
    }

    return localStorage.getItem(TOKEN_KEY);
  });

  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setUser(null);
        setAuthReady(true);
        return;
      }

      try {
        const r = await fetch(`${API}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (!r.ok) {
          throw new Error("auth failed");
        }

        const u = await r.json();

        setUser(u);
      } catch (e) {
        console.error("Auth load failed", e);

        localStorage.removeItem(TOKEN_KEY);

        setToken(null);
        setUser(null);
      } finally {
        setAuthReady(true);
      }
    }

    loadUser();
  }, [token]);

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  function updateUser(u) {
    setUser(u);
  }

  return (
    <AuthCtx.Provider
      value={{
        token,
        setToken,
        user,
        authReady,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}