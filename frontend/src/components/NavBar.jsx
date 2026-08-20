/**
 * NavBar — site header with brand, navigation links, and auth state.
 */

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const { user, logOut } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logOut();
    navigate("/", { replace: true });
  }

  return (
    <header className="app-header">
      <span className="brand-dot" />
      <Link to="/" className="brand-name">
        <h1>Northstar Inventory Sync</h1>
      </Link>

      <nav className="nav-links">
        <Link to="/" className="nav-link">Products</Link>
        {user?.role === "admin" && (
          <Link to="/admin" className="nav-link nav-link-admin">Admin</Link>
        )}
      </nav>

      <div className="nav-auth">
        {user ? (
          <>
            <span className="nav-user" title={user.role}>
              {user.email}
              <span className="role-badge">{user.role}</span>
            </span>
            <button className="btn btn-sm btn-ghost-light" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-sm btn-ghost-light">Sign in</Link>
        )}
      </div>
    </header>
  );
}
