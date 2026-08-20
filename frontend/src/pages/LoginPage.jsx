/**
 * LoginPage — email + password form.
 */

import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";

export default function LoginPage() {
  const { logIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? "/";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Email is required.");
    if (!password)      return setError("Password is required.");
    setLoading(true);
    try {
      await logIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message === "SESSION_EXPIRED" ? "Session expired. Please log in again." : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h2 className="auth-title">Sign in</h2>
        <p className="auth-subtitle">Northstar Inventory Sync</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <><Spinner size="sm" /> Signing in…</> : "Sign in"}
          </button>
        </form>

        <p className="auth-footer">
          No account?{" "}
          <Link to="/signup" state={{ from }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
