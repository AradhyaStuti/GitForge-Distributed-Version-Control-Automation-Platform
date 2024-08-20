import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import "./explore.css";

const Explore = () => {
  const [repos, setRepos] = useState([]);
  const [snippets, setSnippets] = useState([]);
  const [tab, setTab] = useState("repos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [repoRes, snipRes] = await Promise.all([
          api.get("/repo/all?limit=30").catch(() => ({ data: { repositories: [] } })),
          api.get("/snippets?limit=20&sort=recent").catch(() => ({ data: { snippets: [] } })),
        ]);
        setRepos(repoRes.data?.repositories || repoRes.data || []);
        setSnippets(snipRes.data?.snippets || []);
      } catch { /* ignored */ } finally { setLoading(false); }
    };
    fetch();
  }, []);

  return (
    <div className="explore-page">
      <div className="explore-hero">
        <h1>Explore GitForge</h1>
        <p>Discover repositories, snippets, and developers from the community.</p>
      </div>

      <div className="explore-tabs">
        <button className={`explore-tab ${tab === "repos" ? "active" : ""}`} onClick={() => setTab("repos")}>
          Repositories <span className="explore-tab-count">{repos.length}</span>
        </button>
        <button className={`explore-tab ${tab === "snippets" ? "active" : ""}`} onClick={() => setTab("snippets")}>
          Snippets <span className="explore-tab-count">{snippets.length}</span>
        </button>
      </div>

      {loading ? <div className="explore-loading">Loading...</div> : (
        <>
          {tab === "repos" && (
            <div className="explore-grid">
              {repos.length === 0 ? <p className="explore-empty">No public repositories yet.</p> : repos.map((repo) => (
                <Link to={`/repo/${repo._id}`} key={repo._id} className="explore-card">
                  <div className="explore-card-top">
                    <span className="explore-card-owner">{repo.owner?.username}</span>
                    <span className="explore-card-sep">/</span>
                    <span className="explore-card-name">{repo.name}</span>
                  </div>
                  {repo.description && <p className="explore-card-desc">{repo.description}</p>}
                  <div className="explore-card-meta">
                    <span>{new Date(repo.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {tab === "snippets" && (
            <div className="explore-grid">
              {snippets.length === 0 ? <p className="explore-empty">No public snippets yet.</p> : snippets.map((s) => (
                <Link to={`/snippet/${s._id}`} key={s._id} className="explore-card">
                  <div className="explore-card-top">
                    <span className="explore-card-name">{s.title || "Untitled"}</span>
                  </div>
                  {s.description && <p className="explore-card-desc">{s.description}</p>}
                  <div className="explore-card-meta">
                    <span>{s.author?.username}</span>
                    <span>{s.files?.length || 0} files</span>
                    <span>{s.stars?.length || 0} stars</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Explore;
