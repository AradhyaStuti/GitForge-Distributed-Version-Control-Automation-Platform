import { useState } from "react";
import api from "../../api";
import { useAuth } from "../../authContext";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import "./auth.css";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setCurrentUser } = useAuth();

  const getStrength = () => {
    if (!password) return { w: 0, t: "", c: "" };
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    if (s <= 2) return { w: 33, t: "Weak", c: "var(--color-accent-red)" };
    if (s <= 4) return { w: 66, t: "Fair", c: "var(--color-accent-yellow)" };
    return { w: 100, t: "Strong", c: "var(--color-accent-green)" };
  };

  const strength = getStrength();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError("Password needs uppercase, lowercase, and a number.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/signup", { username, email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);
      setCurrentUser(res.data.userId);
      toast.success("Account created!");
      window.location.href = "/";
    } catch (err) {
      const msg = err.response?.data?.message || "Signup failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      <div className="auth-container">
        <div className="auth-logo-row">
          <svg height="36" width="36" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="14" fill="#7c3aed" />
            <path d="M17 10 C17 10 17 28 17 30 C17 36 22 38 28 38 C34 38 39 36 39 30 C39 28 39 10 39 10" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M28 38 L28 46" stroke="white" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <span className="auth-logo-text">Gitless Forge</span>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">Start building and collaborating for free</p>
          </div>

          {error && (
            <div className="auth-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2.343 13.657A8 8 0 1 1 13.66 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="auth-form">
            <div className="auth-field">
              <label htmlFor="username">Username</label>
              <input
                autoComplete="username"
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
              />
              {username && username.length > 0 && username.length < 3 && (
                <span className="auth-field-hint error">At least 3 characters</span>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                autoComplete="email"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="auth-input-wrap">
                <input
                  autoComplete="new-password"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                />
                <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {password && (
                <div className="auth-strength">
                  <div className="auth-strength-track">
                    <div className="auth-strength-bar" style={{ width: `${strength.w}%`, background: strength.c }} />
                  </div>
                  <span className="auth-strength-label" style={{ color: strength.c }}>{strength.t}</span>
                </div>
              )}
              <span className="auth-field-hint">Uppercase, lowercase, and a number required</span>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <span className="auth-btn-inner"><span className="auth-spinner" /> Creating account...</span>
              ) : "Create account"}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <Link to="/auth" className="auth-alt-btn">Sign in to existing account</Link>
        </div>

        <p className="auth-bottom-text">
          {"By creating an account, you agree to Gitless Forge's Terms of Service."}
        </p>
      </div>
    </div>
  );
};

export default Signup;
