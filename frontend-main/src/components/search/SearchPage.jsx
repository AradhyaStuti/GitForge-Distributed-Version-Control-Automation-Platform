import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api";
import { RepoSkeleton } from "../Skeleton";
import "./search.css";

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("repos");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q)}`);
      setResults(res.data.results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
    }
  };

  const repoCount = results?.repositories?.total || 0;
  const issueCount = results?.issues?.total || 0;
  const userCount = results?.users?.total || 0;

  return (
    <div className="search-page">
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search repositories, issues, and users..."
          className="search-input-main"
          autoFocus
        />
        <button type="submit" className="search-submit">Search</button>
      </form>

      {loading && (
        <div className="search-results">
          <RepoSkeleton />
          <RepoSkeleton />
          <RepoSkeleton />
        </div>
      )}

      {results && !loading && (
        <div className="search-layout">
          <aside className="search-sidebar">
            <button
              className={`search-filter ${activeTab === "repos" ? "active" : ""}`}
              onClick={() => setActiveTab("repos")}
            >
              Repositories <span className="filter-count">{repoCount}</span>
            </button>
            <button
              className={`search-filter ${activeTab === "issues" ? "active" : ""}`}
              onClick={() => setActiveTab("issues")}
            >
              Issues <span className="filter-count">{issueCount}</span>
            </button>
            <button
              className={`search-filter ${activeTab === "users" ? "active" : ""}`}
              onClick={() => setActiveTab("users")}
            >
              Users <span className="filter-count">{userCount}</span>
            </button>
          </aside>

          <main className="search-results">
            <h2 className="search-results-title">
              {activeTab === "repos" && `${repoCount} repository results`}
              {activeTab === "issues" && `${issueCount} issue results`}
              {activeTab === "users" && `${userCount} user results`}
            </h2>

            {activeTab === "repos" && (
              <ul className="results-list">
                {results.repositories?.items?.map((repo) => (
                  <li key={repo._id} className="result-item">
                    <Link to={`/repo/${repo._id}`} className="result-title">
                      {repo.owner?.username}/{repo.name}
                    </Link>
                    {repo.description && (
                      <p className="result-desc">{repo.description}</p>
                    )}
                    <span className="result-meta">
                      Updated {new Date(repo.updatedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
                {repoCount === 0 && <p className="no-results">No repositories found.</p>}
              </ul>
            )}

            {activeTab === "issues" && (
              <ul className="results-list">
                {results.issues?.items?.map((issue) => (
                  <li key={issue._id} className="result-item">
                    <div className="result-title">
                      <span className={`issue-dot ${issue.status}`}></span>
                      {issue.title}
                    </div>
                    {issue.description && (
                      <p className="result-desc">{issue.description}</p>
                    )}
                    <span className="result-meta">
                      {issue.repository?.name} - {issue.status} - {new Date(issue.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
                {issueCount === 0 && <p className="no-results">No issues found.</p>}
              </ul>
            )}

            {activeTab === "users" && (
              <ul className="results-list">
                {results.users?.items?.map((user) => (
                  <li key={user._id} className="result-item">
                    <div className="result-user">
                      <div className="result-user-avatar">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="result-title">{user.username}</span>
                        <span className="result-meta">{user.email}</span>
                      </div>
                    </div>
                  </li>
                ))}
                {userCount === 0 && <p className="no-results">No users found.</p>}
              </ul>
            )}
          </main>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
