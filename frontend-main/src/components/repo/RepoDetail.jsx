import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
import { useAuth } from "../../authContext";
import "./repo.css";

const RepoDetail = () => {
  const { id } = useParams();
  const { currentUser, userDetails } = useAuth();
  const [repo, setRepo] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("code");
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDesc, setIssueDesc] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchRepo = async () => {
      try {
        const res = await api.get(`/repo/${id}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setRepo(res.data);

        const issueRes = await api.get(`/issue/all?repositoryId=${id}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setIssues(issueRes.data?.issues || issueRes.data || []);

        if (userDetails?.starRepos?.some((r) => (r._id || r) === id)) {
          setStarred(true);
        }
      } catch (err) {
        if (err.name === "CanceledError") return;
        console.error("Error fetching repo:", err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchRepo();
    return () => controller.abort();
  }, [id, userDetails]);

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!issueTitle.trim()) return;

    try {
      setIssueLoading(true);
      const res = await api.post("/issue/create", {
        title: issueTitle,
        description: issueDesc,
        repositoryId: id,
      });
      setIssues([res.data, ...issues]);
      setIssueTitle("");
      setIssueDesc("");
      setShowNewIssue(false);
      toast.success("Issue created.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create issue.");
    } finally {
      setIssueLoading(false);
    }
  };

  const handleToggleIssue = async (issueId, currentStatus) => {
    if (!currentStatus || !["open", "closed"].includes(currentStatus)) return;
    const newStatus = currentStatus === "open" ? "closed" : "open";

    // Optimistic update
    setIssues((prev) =>
      prev.map((i) => (i._id === issueId ? { ...i, status: newStatus } : i))
    );

    try {
      await api.put(`/issue/update/${issueId}`, { status: newStatus });
    } catch (err) {
      // Rollback on failure
      setIssues((prev) =>
        prev.map((i) => (i._id === issueId ? { ...i, status: currentStatus } : i))
      );
      toast.error("Failed to update issue.");
    }
  };

  if (loading) {
    return (
      <div className="repo-detail-loading" role="status" aria-label="Loading repository">
        <div className="spinner" />
        <p>Loading repository...</p>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="repo-detail-loading">
        <p>Repository not found.</p>
        <Link to="/">Back to dashboard</Link>
      </div>
    );
  }

  const isOwner = repo.owner?._id === currentUser;

  const handleStar = async () => {
    const wasStarred = starred;
    // Optimistic update
    setStarred(!wasStarred);

    try {
      if (wasStarred) {
        await api.delete(`/repo/${id}/star`);
        toast.success("Unstarred.");
      } else {
        await api.post(`/repo/${id}/star`);
        toast.success("Starred!");
      }
    } catch (err) {
      // Rollback
      setStarred(wasStarred);
      toast.error(err.response?.data?.message || "Action failed.");
    }
  };

  const handleFork = async () => {
    try {
      const res = await api.post(`/repo/${id}/fork`);
      toast.success("Repository forked!");
      window.location.href = `/repo/${res.data.repository._id}`;
    } catch (err) {
      toast.error(err.response?.data?.message || "Fork failed.");
    }
  };

  return (
    <div className="repo-detail">
      <div className="repo-detail-header">
        <div className="repo-detail-title">
          <span className="repo-owner-link">
            {repo.owner?.username || "unknown"}
          </span>
          <span className="repo-title-sep">/</span>
          <h1 className="repo-title-name">{repo.name}</h1>
          <span className={`repo-badge ${repo.visibility ? "public" : "private"}`}>
            {repo.visibility ? "Public" : "Private"}
          </span>
          {repo.forkedFrom && (
            <span className="repo-forked-badge">forked</span>
          )}
        </div>

        <div className="repo-actions">
          {!isOwner && (
            <>
              <button className={`repo-action-btn ${starred ? "starred" : ""}`} onClick={handleStar} aria-label={starred ? "Unstar repository" : "Star repository"}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path>
                </svg>
                {starred ? "Starred" : "Star"}
              </button>
              <button className="repo-action-btn" onClick={handleFork} aria-label="Fork repository">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"></path>
                </svg>
                Fork
              </button>
            </>
          )}
        </div>

        {repo.description && <p className="repo-detail-desc">{repo.description}</p>}
      </div>

      <div className="repo-tabs">
        <button className={`repo-tab ${activeTab === "code" ? "active" : ""}`} onClick={() => setActiveTab("code")}>Code</button>
        <button className={`repo-tab ${activeTab === "issues" ? "active" : ""}`} onClick={() => setActiveTab("issues")}>
          Issues
          {issues.filter((i) => i.status === "open").length > 0 && (
            <span className="tab-count">{issues.filter((i) => i.status === "open").length}</span>
          )}
        </button>
        <Link to={`/repo/${id}/pulls`} className="repo-tab repo-tab-link">
          Pull Requests
        </Link>
        <Link to={`/repo/${id}/pipelines`} className="repo-tab repo-tab-link">
          Pipelines
        </Link>
        <Link to={`/repo/${id}/boards`} className="repo-tab repo-tab-link">
          Boards
        </Link>
        <Link to={`/repo/${id}/analytics`} className="repo-tab repo-tab-link">
          Analytics
        </Link>
        <Link to={`/repo/${id}/files`} className="repo-tab repo-tab-link">
          Files
        </Link>
      </div>

      {activeTab === "code" && (
        <div className="repo-code-section">
          <div className="repo-code-card">
            <div className="code-card-header"><span>Quick setup - use the CLI to push an existing repository</span></div>
            <div className="code-card-body">
              <code className="code-snippet">
                node index.js init{"\n"}
                node index.js add-all{"\n"}
                node index.js commit {'"Initial commit"'}{"\n"}
                node index.js push
              </code>
            </div>
          </div>
          {repo.content && repo.content.length > 0 && (
            <div className="repo-files">
              <div className="files-header"><span>Files</span></div>
              <ul className="files-list">
                {repo.content.map((file, index) => (
                  <li key={index} className="file-item">
                    <span className="file-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"></path></svg>
                    </span>
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === "issues" && (
        <div className="repo-issues-section">
          <div className="issues-header">
            <span className="issues-count">
              {issues.filter((i) => i.status === "open").length} Open{" "}
              {issues.filter((i) => i.status === "closed").length} Closed
            </span>
            <button className="btn-new-issue" onClick={() => setShowNewIssue(!showNewIssue)}>New issue</button>
          </div>
          {showNewIssue && (
            <form onSubmit={handleCreateIssue} className="new-issue-form">
              <input type="text" placeholder="Title" value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} className="issue-input" aria-label="Issue title" />
              <textarea placeholder="Leave a comment" value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} className="issue-textarea" rows={4} aria-label="Issue description" />
              <div className="issue-form-actions">
                <button type="submit" className="btn-submit-issue" disabled={issueLoading}>{issueLoading ? "Submitting..." : "Submit new issue"}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowNewIssue(false)}>Cancel</button>
              </div>
            </form>
          )}
          {issues.length === 0 ? (
            <div className="issues-empty"><h3>No issues yet</h3><p>Issues are used to track bugs, enhancements, and tasks.</p></div>
          ) : (
            <ul className="issues-list">
              {issues.map((issue) => (
                <li key={issue._id} className="issue-item">
                  <span className={`issue-status-icon ${issue.status}`} title={issue.status}>
                    {issue.status === "open" ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path></svg>
                    )}
                  </span>
                  <div className="issue-content">
                    <span className="issue-title">{issue.title}</span>
                    {issue.description && <p className="issue-desc">{issue.description}</p>}
                    <span className="issue-meta">opened {new Date(issue.createdAt).toLocaleDateString()}</span>
                  </div>
                  {isOwner && (
                    <button className={`btn-toggle-issue ${issue.status}`} onClick={() => handleToggleIssue(issue._id, issue.status)}>
                      {issue.status === "open" ? "Close" : "Reopen"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default RepoDetail;
