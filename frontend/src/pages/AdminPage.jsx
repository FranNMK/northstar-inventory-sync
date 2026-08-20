/**
 * AdminPage — product management panel (admin role only).
 */

import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
} from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import StockBadge from "../components/StockBadge";
import Spinner from "../components/Spinner";

const EMPTY_FORM = {
  id: "",
  name: "",
  category: "",
  current_stock: "",
  price: "",
  image_url: "",
};

function validate(form, isEdit = false) {
  const errors = {};
  if (!isEdit && !form.id.trim())      errors.id = "SKU is required.";
  if (!isEdit && !/^[A-Za-z0-9_-]+$/.test(form.id.trim())) errors.id = "SKU: letters, numbers, _ and - only.";
  if (!form.name.trim())               errors.name = "Name is required.";
  if (!form.category.trim())           errors.category = "Category is required.";
  if (form.current_stock === "" || form.current_stock === null) {
    errors.current_stock = "Stock is required.";
  } else if (Number(form.current_stock) < 0 || Number(form.current_stock) > 1_000_000) {
    errors.current_stock = "Stock must be between 0 and 1,000,000.";
  }
  if (form.price !== "" && form.price !== null) {
    if (Number(form.price) < 0 || Number(form.price) > 1_000_000) {
      errors.price = "Price must be between 0 and 1,000,000.";
    }
  }
  return errors;
}

export default function AdminPage() {
  const { handleExpired } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts]       = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError]     = useState(null);

  const [form, setForm]               = useState(EMPTY_FORM);
  const [formErrors, setFormErrors]   = useState({});
  const [submitting, setSubmitting]   = useState(false);

  const [editingId, setEditingId]     = useState(null);
  const [deletingId, setDeletingId]   = useState(null);

  // ── Load products ────────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
      setPageError(null);
    } catch (err) {
      if (err.status === 401) { handleExpired(); navigate("/login", { state: { from: "/admin" } }); return; }
      setPageError(err.message);
    } finally {
      setPageLoading(false);
    }
  }, [handleExpired, navigate]);

  useEffect(() => { loadProducts(); }, [loadProducts]); // oxlint-disable-line set-state-in-effect

  // ── Form helpers ─────────────────────────────────────────────────────────────
  function fieldChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFormErrors((fe) => ({ ...fe, [name]: undefined }));
  }

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      id: product.id,
      name: product.name,
      category: product.category,
      current_stock: String(product.current_stock),
      price: product.price != null ? String(product.price) : "",
      image_url: product.image_url ?? "",
    });
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate(form, editingId !== null);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    const sharedFields = {
      name: form.name.trim(),
      category: form.category.trim(),
      current_stock: Number(form.current_stock),
      price: form.price !== "" ? Number(form.price) : null,
      image_url: form.image_url.trim() || null,
    };

    setSubmitting(true);
    try {
      if (editingId !== null) {
        await adminUpdateProduct(editingId, sharedFields);
        addToast("Product updated successfully.", "success");
        cancelEdit();
      } else {
        await adminCreateProduct({ id: form.id.trim(), ...sharedFields });
        addToast("Product created successfully.", "success");
        setForm(EMPTY_FORM);
      }
      await loadProducts();
    } catch (err) {
      if (err.status === 401) { handleExpired(); navigate("/login", { state: { from: "/admin" } }); return; }
      if (err.status === 403) { addToast("Admin access required.", "error"); return; }
      addToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm(`Delete product "${id}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await adminDeleteProduct(id);
      addToast("Product deleted.", "success");
      await loadProducts();
    } catch (err) {
      if (err.status === 401) { handleExpired(); navigate("/login", { state: { from: "/admin" } }); return; }
      addToast(err.message, "error");
    } finally {
      setDeletingId(null);
    }
  }

  const isEdit = editingId !== null;

  return (
    <>
      <div className="products-header">
        <h2>{isEdit ? `Editing: ${editingId}` : "Add Product"}</h2>
        {isEdit && (
          <button className="btn btn-ghost" onClick={cancelEdit}>Cancel edit</button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 32 }}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="admin-form-grid">
            {!isEdit && (
              <div className="form-group">
                <label className="form-label">SKU / ID <span className="form-required">*</span></label>
                <input name="id"
                  className={`form-input${formErrors.id ? " form-input-error" : ""}`}
                  value={form.id} onChange={fieldChange}
                  placeholder="e.g. SKU-001" disabled={submitting} />
                {formErrors.id && <span className="form-error">{formErrors.id}</span>}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Name <span className="form-required">*</span></label>
              <input name="name"
                className={`form-input${formErrors.name ? " form-input-error" : ""}`}
                value={form.name} onChange={fieldChange}
                placeholder="Product name" disabled={submitting} />
              {formErrors.name && <span className="form-error">{formErrors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Category <span className="form-required">*</span></label>
              <input name="category"
                className={`form-input${formErrors.category ? " form-input-error" : ""}`}
                value={form.category} onChange={fieldChange}
                placeholder="e.g. Electronics" disabled={submitting} />
              {formErrors.category && <span className="form-error">{formErrors.category}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Stock <span className="form-required">*</span></label>
              <input name="current_stock" type="number" min="0" max="1000000"
                className={`form-input${formErrors.current_stock ? " form-input-error" : ""}`}
                value={form.current_stock} onChange={fieldChange}
                placeholder="0" disabled={submitting} />
              {formErrors.current_stock && <span className="form-error">{formErrors.current_stock}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Price (KSh)</label>
              <input name="price" type="number" min="0" step="0.01"
                className={`form-input${formErrors.price ? " form-input-error" : ""}`}
                value={form.price} onChange={fieldChange}
                placeholder="Optional" disabled={submitting} />
              {formErrors.price && <span className="form-error">{formErrors.price}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Image URL</label>
              <input name="image_url" type="text" className="form-input"
                value={form.image_url} onChange={fieldChange}
                placeholder="https://… (optional)" disabled={submitting} />
              {form.image_url.trim() && (
                <img src={form.image_url.trim()} alt="Preview"
                  className="admin-image-preview"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  onLoad={(e)  => { e.currentTarget.style.display = "block"; }}
                />
              )}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? <><Spinner size="sm" /> {isEdit ? "Saving…" : "Creating…"}</>
                : isEdit ? "Save changes" : "Create product"}
            </button>
          </div>
        </form>
      </div>

      <div className="products-header">
        <h2>All Products</h2>
        <span className="refresh-hint">{products.length} product{products.length !== 1 ? "s" : ""}</span>
      </div>

      {pageError && <div className="error-banner">Could not load products: {pageError}</div>}

      <div className="card">
        {pageLoading ? (
          <div className="state-box">
            <div className="spinner" style={{ width: 36, height: 36 }} />
            <p>Loading products…</p>
          </div>
        ) : products.length === 0 ? (
          <p className="no-results">No products yet. Add one above.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 48 }}></th>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ cursor: "default" }}>
                  <td style={{ padding: "8px 8px 8px 12px" }}>
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="product-thumb" />
                      : <span className="product-thumb-placeholder" />}
                  </td>
                  <td style={{ color: "#57606a", fontFamily: "monospace" }}>{p.id}</td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td>{p.category}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{p.current_stock}</td>
                  <td><StockBadge status={p.status} /></td>
                  <td style={{ color: "#57606a" }}>
                    {p.price != null
                      ? `KSh ${Number(p.price).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-sm btn-ghost"
                        onClick={() => startEdit(p)}
                        disabled={deletingId === p.id}>
                        Edit
                      </button>
                      <button className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}>
                        {deletingId === p.id ? <><Spinner size="sm" /> Deleting…</> : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
