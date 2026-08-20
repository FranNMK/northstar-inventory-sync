/**
 * api.js — all API calls, including auth-aware requests.
 *
 * Token is stored in module-level memory (not localStorage) for better security.
 * The setToken / getToken helpers are called by AuthContext.
 */

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// In-memory token store — survives page re-renders but not hard refreshes.
// This is intentional: avoids XSS risks of localStorage.
let _token = null;

export function setToken(t) { _token = t; }
export function getToken() { return _token; }
export function clearToken() { _token = null; }

// ── Core fetch wrapper ──────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers ?? {}) };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Signal callers to handle session expiry
    const err = new Error("SESSION_EXPIRED");
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore parse errors */
    }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }

  // 204 No Content — no body
  if (res.status === 204) return null;
  return res.json();
}

// ── Public product endpoints ────────────────────────────────────────────────────

export const fetchProducts = (category) =>
  apiFetch(`/products${category ? `?category=${encodeURIComponent(category)}` : ""}`);

export const fetchStock = (productId) =>
  apiFetch(`/products/${encodeURIComponent(productId)}/stock`);

// ── Auth endpoints ──────────────────────────────────────────────────────────────

export const login = (email, password) =>
  apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const signup = (email, password, role = "staff") =>
  apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });

export const fetchMe = () => apiFetch("/auth/me");

// ── Admin product endpoints ─────────────────────────────────────────────────────

export const adminCreateProduct = (data) =>
  apiFetch("/admin/products", { method: "POST", body: JSON.stringify(data) });

export const adminUpdateProduct = (id, data) =>
  apiFetch(`/admin/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const adminDeleteProduct = (id) =>
  apiFetch(`/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
