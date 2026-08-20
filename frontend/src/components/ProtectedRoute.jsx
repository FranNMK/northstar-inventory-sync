/**
 * ProtectedRoute — redirects to /login if not authenticated,
 * or to / if authenticated but lacking the required role.
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="state-box" style={{ paddingTop: 120 }}>
        <div className="spinner" style={{ width: 36, height: 36, margin: "0 auto 12px" }} />
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
