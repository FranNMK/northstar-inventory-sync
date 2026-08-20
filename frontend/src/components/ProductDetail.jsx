/**
 * ProductDetail — modal panel showing live stock for a single product.
 * Polls GET /products/{id}/stock every 10 s so it stays current.
 */

import { useCallback } from "react";
import { fetchStock } from "../api";
import { usePolling } from "../hooks/usePolling";
import StockBadge from "./StockBadge";

export default function ProductDetail({ product, onClose }) {
  const fetchFn = useCallback(() => fetchStock(product.id), [product.id]);
  const { data, loading, error } = usePolling(fetchFn, 10_000);

  const fmt = (iso) =>
    iso
      ? new Date(iso).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          ×
        </button>

        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className="detail-image"
          />
        )}

        <h2>{product.name}</h2>
        <p className="category">{product.category}</p>

        {product.price != null && (
          <p className="detail-price">KSh {Number(product.price).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
        )}

        {loading && !data && (
          <div className="state-box">
            <div className="spinner" />
            <p>Loading stock…</p>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        {data && (
          <>
            <div className={`stock-number ${data.status}`}>
              {data.current_stock}
            </div>
            <StockBadge status={data.status} />
            <p className="detail-meta">Last updated: {fmt(data.last_updated)}</p>
          </>
        )}
      </div>
    </div>
  );
}
