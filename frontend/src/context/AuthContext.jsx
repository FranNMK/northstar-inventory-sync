/**
 * AuthContext — provides authentication state and actions app-wide.
 *
 * Token is kept in module-level memory in api.js (not localStorage).
 * On mount we attempt to restore session via GET /auth/me if a token was
 * previously written to sessionStorage (survives tab navigation, not new tabs).
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { login as apiLogin, clearToken, fetchMe, setToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // { email, role } | null
  const [authLoading, setAuthLoading] = useState(true);

  // ── Restore session from sessionStorage on first mount ──────────────────────
  useEffect(() => {
    const saved = sessionStorage.getItem("ns_token");
    if (!saved) {
      setAuthLoading(false); // oxlint-disable-line react/set-state-in-effect
      return;
    }
    setToken(saved);
    fetchMe()
      .then((u) => setUser({ email: u.email, role: u.role }))
      .catch(() => {
        sessionStorage.removeItem("ns_token");
        clearToken();
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const logIn = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    sessionStorage.setItem("ns_token", data.access_token);
    setToken(data.access_token);
    setUser({ email: data.email, role: data.role });
  }, []);

  const logOut = useCallback(() => {
    sessionStorage.removeItem("ns_token");
    clearToken();
    setUser(null);
  }, []);

  const handleExpired = useCallback(() => {
    sessionStorage.removeItem("ns_token");
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, authLoading, logIn, logOut, handleExpired }}>
      {children}
    </AuthContext.Provider>
  );
}

// oxlint-disable-next-line only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
