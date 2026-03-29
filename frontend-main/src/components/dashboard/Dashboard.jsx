import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../authContext";
import { useDebounce } from "../../hooks/useDebounce";
import "./dashboard.css";

const Dashboard = () => {
  const { currentUser, userDetails } = useAuth();
  const [repositories, setRepositories] = useState([]);
  const [stats, setStats] = useState(null);
  const [feed, setFeed] = useState([]);
  const [trending, setTrending] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const [userRepos, statsRes, feedRes, trendingRes] = await Promise.all([
          api.get(`/repo/user/${currentUser}`, { signal: controller.signal }).catch(() => ({ data: { repositories: [] } })),
          api.get("/stats", { signal: controller.signal }).catch(() => ({ data: null })),
          api.get("/feed?limit=6", { signal: controller.signal }).catch(() => ({ data: [] })),
          api.get("/trending?limit=5", { signal: controller.signal }).catch(() => ({ data: [] })),
        ]);
        if (controller.signal.aborted) return;
        setRepositories(userRepos.data.repositories || []);
        setStats(statsRes.data);
        setFeed(Array.isArray(feedRes.data) ? feedRes.data : []);
        setTrending(Array.isArray(trendingRes.data) ? trendingRes.data : []);
      } catch { /* ignored */ } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    if (currentUser) fetchData();
    return () => controller.abort();
  }, [currentUser]);

  const filteredRepos = debouncedSearch
    ? repositories.filter((r) => r.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : repositories;

  const username = userDetails?.username || "there";

  if (loading) return <div className="dash"><div className="dash-loading"><div className="spinner" /></div></div>;

  return (
    <div className="dash">
      {/* ── Top bar: welcome + stats ──────────────── */}
      <div className="dash-top">
        <div className="dash-welcome">
          <div>
            <h1>Welcome, {username}</h1>
            <p>{"Here's what's happening across your projects."}</p>
          </div>
          <Link to="/create" className="dash-btn-primary">+ New repository</Link>
        </div>

        {stats && (
          <div className="dash-stats">
            <div className="dash-stat"><span className="ds-num">{stats.repos}</span><span className="ds-label">Repos</span></div>
            <div className="dash-stat"><span className="ds-num">{stats.openIssues}</span><span className="ds-label">Issues</span></div>
            <div className="dash-stat"><span className="ds-num">{stats.pullRequests}</span><span className="ds-label">PRs</span></div>
            <div className="dash-stat"><span className="ds-num">{stats.stars}</span><span className="ds-label">Stars</span></div>
          </div>
        )}
      </div>

      {/* ── Two-column body ───────────────────────── */}
      <div className="dash-body">
        {/* Left: repos */}
        <div className="dash-main">
          {/* Quick nav */}
          <div className="dash-nav-row">
            <Link to="/create" className="dash-nav-item">+ New repo</Link>
            <Link to="/snippets" className="dash-nav-item">Snippets</Link>
            <Link to="/explore" className="dash-nav-item">Explore</Link>
            <Link to="/bookmarks" className="dash-nav-item">Bookmarks</Link>
          </div>

          <div className="dash-repos-card">
            <div className="dash-repos-header">
              <h2>Your Repositories <span className="dash-count">{repositories.length}</span></h2>
            </div>
            <div className="dash-search">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--color-text-tertiary)"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" /></svg>
              <input type="search" value={searchQuery} placeholder="Find a repository..." onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            {filteredRepos.length === 0 ? (
              <div className="dash-empty">
                {repositories.length === 0 ? (
                  <>
                    <h3>No repositories yet</h3>
                    <p>Create your first repository to get started.</p>
                    <Link to="/create" className="dash-btn-primary" style={{ marginTop: 8 }}>Create repository</Link>
                  </>
                ) : <p>No match for {`"${debouncedSearch}"`}</p>}
              </div>
            ) : (
              <ul className="dash-repo-list">
                {filteredRepos.map((repo) => (
                  <li key={repo._id} className="dash-repo-item">
                    <div className="dash-repo-top">
                      <Link to={`/repo/${repo._id}`} className="dash-repo-name">{repo.name}</Link>
                      <span className={`dash-repo-vis ${repo.visibility ? "" : "private"}`}>{repo.visibility ? "Public" : "Private"}</span>
                    </div>
                    {repo.description && <p className="dash-repo-desc">{repo.description}</p>}
                    <span className="dash-repo-date">Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: sidebar */}
        <aside className="dash-side">
          <div className="dash-card">
            <h3 className="dash-card-title">Recent Activity</h3>
            {feed.length === 0 ? (
              <p className="dash-card-empty">No activity yet.</p>
            ) : (
              <ul className="dash-feed">
                {feed.map((item, i) => (
                  <li key={i} className="dash-feed-item">
                    <span className={`dash-feed-dot ${item.type}`} />
                    <div className="dash-feed-body">
                      <span className="dash-feed-msg">
                        {item.type === "repo" && `Updated ${item.data.name}`}
                        {item.type === "issue" && `${item.data.status === "open" ? "Opened" : "Closed"} "${item.data.title}"`}
                        {item.type === "pr" && `${item.data.status} PR "${item.data.title}"`}
                      </span>
                      <span className="dash-feed-time">{new Date(item.date).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {trending.length > 0 && (
            <div className="dash-card">
              <h3 className="dash-card-title">Trending</h3>
              <ul className="dash-trending">
                {trending.map((repo) => (
                  <li key={repo._id}>
                    <Link to={`/repo/${repo._id}`} className="dash-trending-link">
                      <span className="dash-trending-owner">{repo.owner?.username}/</span>
                      <span className="dash-trending-name">{repo.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
