import { useState, useEffect } from "react";
import api from "../../api";
import toast from "react-hot-toast";
import "./admin.css";

const Admin = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/analytics")
      .then((r) => setData(r.data))
      .catch(() => toast.error("Failed to load analytics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-page"><div className="spinner" style={{ margin: "80px auto" }} /></div>;
  if (!data) return <div className="admin-page"><p>Failed to load.</p></div>;

  const formatBytes = (b) => (b / 1024 / 1024).toFixed(1) + " MB";
  const formatUptime = (s) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="admin-page">
      <h1>Platform Analytics</h1>
      <p className="admin-subtitle">Overview of Gitless Forge platform metrics.</p>

      <div className="admin-stats">
        {Object.entries(data.totals).map(([key, val]) => (
          <div key={key} className="admin-stat">
            <span className="admin-stat-num">{val.toLocaleString()}</span>
            <span className="admin-stat-label">{key.replace(/([A-Z])/g, " $1")}</span>
          </div>
        ))}
      </div>

      <div className="admin-grid">
        <div className="admin-card">
          <h3>This Week</h3>
          <div className="admin-week-stats">
            <div className="admin-week-item"><span className="admin-week-num">+{data.thisWeek.users}</span><span>New Users</span></div>
            <div className="admin-week-item"><span className="admin-week-num">+{data.thisWeek.repos}</span><span>New Repos</span></div>
            <div className="admin-week-item"><span className="admin-week-num">+{data.thisWeek.issues}</span><span>New Issues</span></div>
          </div>
        </div>

        <div className="admin-card">
          <h3>System</h3>
          <div className="admin-sys-list">
            <div className="admin-sys-row"><span>Uptime</span><span>{formatUptime(data.system.uptime)}</span></div>
            <div className="admin-sys-row"><span>Node.js</span><span>{data.system.nodeVersion}</span></div>
            <div className="admin-sys-row"><span>Heap Used</span><span>{formatBytes(data.system.memory.heapUsed)}</span></div>
            <div className="admin-sys-row"><span>RSS</span><span>{formatBytes(data.system.memory.rss)}</span></div>
          </div>
        </div>

        <div className="admin-card">
          <h3>Recent Users</h3>
          <ul className="admin-recent-list">
            {data.recent.users.map((u) => (
              <li key={u._id}>
                <strong>{u.username}</strong>
                <span>{u.email}</span>
                <span>{new Date(u.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="admin-card">
          <h3>Recent Repos</h3>
          <ul className="admin-recent-list">
            {data.recent.repos.map((r) => (
              <li key={r._id}>
                <strong>{r.owner?.username}/{r.name}</strong>
                <span>{r.visibility ? "Public" : "Private"}</span>
                <span>{new Date(r.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Admin;
