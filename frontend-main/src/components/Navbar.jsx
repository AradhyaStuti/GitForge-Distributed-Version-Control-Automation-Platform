import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../authContext";
import { useTheme } from "../hooks/useTheme.jsx";
import NotificationBell from "./NotificationBell";
import "./navbar.css";

const Navbar = () => {
  const { userDetails, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <nav className="navbar" role="navigation">
        <div className="navbar-left">
          <Link to="/" className="navbar-brand">
            <svg height="24" width="24" viewBox="0 0 56 56" fill="none">
              <rect width="56" height="56" rx="14" fill="#7c3aed" />
              <path d="M17 10 C17 10 17 28 17 30 C17 36 22 38 28 38 C34 38 39 36 39 30 C39 28 39 10 39 10" stroke="white" strokeWidth="5.5" strokeLinecap="round" fill="none" />
              <path d="M28 38 L28 46" stroke="white" strokeWidth="5.5" strokeLinecap="round" />
            </svg>
            <span>GitForge</span>
          </Link>

          <form onSubmit={handleSearch} className="navbar-search" role="search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--color-text-secondary)"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" /></svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="navbar-search-input"
            />
          </form>
        </div>

        <div className="navbar-right">
          <Link to="/create" className="navbar-btn-new">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" /></svg>
            New
          </Link>

          <NotificationBell />

          <button className="navbar-icon-btn" onClick={toggleTheme} title={`${theme === "dark" ? "Light" : "Dark"} mode`}>
            {theme === "dark" ? (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 1.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0Zm0 13a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13Z" /></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.499 5.499 0 1 0 7.678-7.678Z" /></svg>
            )}
          </button>

          {/* User dropdown */}
          <div className="navbar-user" ref={menuRef}>
            <button className="navbar-avatar" onClick={() => setMenuOpen(!menuOpen)}>
              {(userDetails?.username || "U")[0].toUpperCase()}
            </button>

            {menuOpen && (
              <div className="navbar-dropdown">
                <div className="navbar-dropdown-header">
                  <strong>{userDetails?.username}</strong>
                  <span>{userDetails?.email}</span>
                </div>
                <div className="navbar-dropdown-divider" />
                <Link to="/profile" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>Your profile</Link>
                <Link to="/" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>Your repositories</Link>
                <Link to="/snippets" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>Your snippets</Link>
                <Link to="/bookmarks" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>Bookmarks</Link>
                <Link to="/explore" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>Explore</Link>
                <div className="navbar-dropdown-divider" />
                <Link to="/settings" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>Settings</Link>
                <div className="navbar-dropdown-divider" />
                <button className="navbar-dropdown-item navbar-dropdown-logout" onClick={() => { setMenuOpen(false); logout(); }}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
