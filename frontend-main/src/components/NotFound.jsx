import { Link } from "react-router-dom";

const NotFound = () => (
  <div style={{
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", padding: 24,
    textAlign: "center", background: "var(--color-bg-primary)",
  }}>
    <div style={{ fontSize: "5rem", fontWeight: 800, color: "var(--color-accent-brand)", lineHeight: 1, letterSpacing: -2 }}>404</div>
    <h1 style={{ fontSize: "1.3rem", fontWeight: 600, margin: "12px 0 6px", color: "var(--color-text-primary)" }}>Page not found</h1>
    <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginBottom: 20, maxWidth: 400 }}>
      {"The page you're looking for doesn't exist or has been moved."}
    </p>
    <div style={{ display: "flex", gap: 10 }}>
      <Link to="/" style={{
        padding: "8px 18px", fontSize: "0.84rem", fontWeight: 600,
        color: "white", background: "var(--color-accent-brand)",
        borderRadius: 8, textDecoration: "none",
      }}>Go to Dashboard</Link>
      <Link to="/explore" style={{
        padding: "8px 18px", fontSize: "0.84rem", fontWeight: 600,
        color: "var(--color-text-primary)", background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)", borderRadius: 8, textDecoration: "none",
      }}>Explore</Link>
    </div>
  </div>
);

export default NotFound;
