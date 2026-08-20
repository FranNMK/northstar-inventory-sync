/**
 * ProductList — main page showing all products with their live stock status.
 *
 * Polls GET /products every 12 s.  Clicking a row opens the ProductDetail modal.
 */

import { useState, useMemo, useCallback } from "react";
import { fetchProducts } from "../api";
import { usePolling } from "../hooks/usePolling";
import StockBadge from "./StockBadge";
import ProductDetail from "./ProductDetail";

export default function ProductList() {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  // Fetch all products; the category filter is applied client-side so
  // typing doesn't reset the poll interval.
  const fetchFn = useCallback(() => fetchProducts(), []);
  const { data: products, loading, error } = usePolling(fetchFn, 12_000);

  const categories = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map((p) => p.category))].sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchCat = !categoryFilter || p.category === categoryFilter;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, categoryFilter, search]);

  const fmt = (iso) =>
    iso
      ? new Date(iso).toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "—";

  return (
    <>
      <div className="products-header">
        <h2>Products</h2>
        <span className="refresh-hint">Auto-refreshes every 12 s</span>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flexGrow: 1, minWidth: 200 }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error-banner">Could not load products: {error}</div>}

      <div className="card">
        {loading && !products ? (
          <div className="state-box">
            <div className="spinner" />
            <p>Loading products…</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="no-results">No products match your filters.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 48 }}></th>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => setSelected(p)}>
                  <td style={{ padding: "8px 8px 8px 12px" }}>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="product-thumb"
                      />
                    ) : (
                      <span className="product-thumb-placeholder" />
                    )}
                  </td>
                  <td style={{ color: "#57606a", fontFamily: "monospace" }}>
                    {p.id}
                  </td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td>{p.category}</td>
                  <td style={{ color: "#57606a", fontVariantNumeric: "tabular-nums" }}>
                    {p.price != null ? `KSh ${Number(p.price).toLocaleString("en-KE", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>
                    {p.current_stock}
                  </td>
                  <td>
                    <StockBadge status={p.status} />
                  </td>
                  <td style={{ color: "#57606a", fontSize: 13 }}>
                    {fmt(p.last_updated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <ProductDetail product={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
