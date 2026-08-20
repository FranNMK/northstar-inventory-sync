const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

export const fetchProducts = (category) =>
  apiFetch(`/products${category ? `?category=${encodeURIComponent(category)}` : ""}`);

export const fetchStock = (productId) =>
  apiFetch(`/products/${encodeURIComponent(productId)}/stock`);
