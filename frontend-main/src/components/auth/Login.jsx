import { useState } from "react";
import api from "../../api";
import { useAuth } from "../../authContext";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import "./auth.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setCurrentUser } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);
      setCurrentUser(res.data.userId);
      toast.success("Welcome back!");
      window.location.href = "/";
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Please try again.";
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
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="auth-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2.343 13.657A8 8 0 1 1 13.66 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="auth-form">
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
                  autoComplete="current-password"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
                <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <span className="auth-btn-inner"><span className="auth-spinner" /> Signing in...</span>
              ) : "Sign in"}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <Link to="/signup" className="auth-alt-btn">Create a new account</Link>
        </div>

        <p className="auth-bottom-text">
          {"By continuing, you agree to Gitless Forge's Terms of Service."}
        </p>
      </div>
    </div>
  );
};

export default Login;
