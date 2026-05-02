import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
import "./pr.css";

const PullRequests = () => {
  const { repoId } = useParams();
  const [prs, setPrs] = useState([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [repo, setRepo] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [prRes, repoRes] = await Promise.all([
          api.get(`/pr/all?repositoryId=${repoId}&status=${filter}`),
          api.get(`/repo/${repoId}`),
        ]);
        setPrs(prRes.data.pullRequests || []);
        setRepo(repoRes.data);
      } catch {
        toast.error("Failed to load pull requests.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [repoId, filter]);

  const statusColors = { open: "#3fb950", closed: "#da3633", merged: "#a371f7" };

  return (
    <div className="pr-page">
      <div className="pr-header">
        <div className="pr-header-left">
          <Link to={`/repo/${repoId}`} className="pr-back-link">
            {repo?.owner?.username}/{repo?.name}
          </Link>
          <h2>Pull Requests</h2>
        </div>
        <Link to={`/repo/${repoId}/pr/new`} className="btn-new-pr">
          + New Pull Request
        </Link>
      </div>

      <div className="pr-filters">
        {["open", "closed", "merged"].map((s) => (
          <button
            key={s}
            className={`pr-filter-btn ${filter === s ? "active" : ""}`}
            onClick={() => { setFilter(s); setLoading(true); }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="pr-loading"><div className="spinner" /> Loading pull requests...</div>
      ) : prs.length === 0 ? (
        <div className="pr-empty">
          <svg width="48" height="48" viewBox="0 0 16 16" fill="var(--color-text-secondary)" style={{marginBottom: 12}}>
            <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
          </svg>
          <h3>No {filter} pull requests</h3>
          <p>Pull requests help you collaborate on code changes.</p>
          <Link to={`/repo/${repoId}/pr/new`} className="btn-new-pr" style={{marginTop: 12}}>Create a pull request</Link>
        </div>
      ) : (
        <ul className="pr-list">
          {prs.map((pr) => (
            <li key={pr._id} className="pr-item">
              <div className="pr-item-icon" style={{ color: statusColors[pr.status] }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
                </svg>
              </div>
              <div className="pr-item-content">
                <Link to={`/pr/${pr._id}`} className="pr-item-title">{pr.title}</Link>
                <div className="pr-item-meta">
                  #{pr._id.slice(-4)} opened by {pr.author?.username || "unknown"} on{" "}
                  {new Date(pr.createdAt).toLocaleDateString()}
                  <span className="pr-branch-info">
                    {pr.sourceBranch} → {pr.targetBranch}
                  </span>
                </div>
                {pr.labels?.length > 0 && (
                  <div className="pr-item-labels">
                    {pr.labels.map((l, i) => (
                      <span key={i} className="label-badge">{l}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className={`pr-status-badge ${pr.status}`}>{pr.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PullRequests;
