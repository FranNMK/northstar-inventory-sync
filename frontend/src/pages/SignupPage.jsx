/**
 * SignupPage — create a new user account.
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../api";
import Spinner from "../components/Spinner";

export default function SignupPage() {
  const navigate = useNavigate();

  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [role, setRole]           = useState("staff");
  const [showPw, setShowPw]       = useState(false);
  const [showCon, setShowCon]     = useState(false);
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!email.trim())           return setError("Email is required.");
    if (password.length < 8)     return setError("Password must be at least 8 characters.");
    if (password !== confirm)    return setError("Passwords do not match.");
    setLoading(true);
    try {
      await signup(email, password, role);
      navigate("/login", { state: { signedUp: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h2 className="auth-title">Create account</h2>
        <p className="auth-subtitle">Northstar Inventory Sync</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input id="email" type="email" className="form-input" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email"
              disabled={loading} required />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password <span className="form-hint">(min. 8 characters)</span>
            </label>
            <div className="pw-wrap">
              <input id="password" type={showPw ? "text" : "password"}
                className="form-input" value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password" disabled={loading} required />
              <button type="button" className="pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}>
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm" className="form-label">Confirm password</label>
            <div className="pw-wrap">
              <input id="confirm" type={showCon ? "text" : "password"}
                className="form-input" value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password" disabled={loading} required />
              <button type="button" className="pw-toggle"
                onClick={() => setShowCon((v) => !v)}
                aria-label={showCon ? "Hide password" : "Show password"}>
                {showCon ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role" className="form-label">Role</label>
            <select id="role" className="form-input" value={role}
              onChange={(e) => setRole(e.target.value)} disabled={loading}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <><Spinner size="sm" /> Creating account…</> : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
