import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../authContext";
import HeatMapProfile from "./HeatMap";
import "./profile.css";

const Profile = () => {
  const { currentUser, userDetails, logout } = useAuth();
  const [repos, setRepos] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchRepos = async () => {
      try {
        const res = await api.get(`/repo/user/${currentUser}`, { signal: controller.signal });
        if (!controller.signal.aborted) setRepos(res.data.repositories || []);
      } catch (err) {
        if (err.name === "CanceledError") return;
        console.warn("Failed to fetch repos:", err.message);
        setRepos([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    if (currentUser) fetchRepos();
    return () => controller.abort();
  }, [currentUser]);

  return (
    <div className="profile-page">
      <aside className="profile-sidebar" aria-label="User profile">
        <div className="profile-avatar" aria-hidden="true">
          {(userDetails?.username || "U")[0].toUpperCase()}
        </div>
        <h2 className="profile-username">{userDetails?.username || "User"}</h2>
        <p className="profile-email">{userDetails?.email || ""}</p>

        <button className="btn-edit-profile" onClick={logout}>Sign out</button>

        <div className="profile-stats">
          <span>{repos.length} repositories</span>
          <span>{userDetails?.followedUsers?.length || 0} following</span>
        </div>

        <p className="profile-joined">
          Joined {userDetails?.createdAt
            ? new Date(userDetails.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
            : "recently"}
        </p>
      </aside>

      <main className="profile-main">
        <div className="profile-tabs" role="tablist">
          <button role="tab" aria-selected={activeTab === "overview"} className={`profile-tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
          <button role="tab" aria-selected={activeTab === "repos"} className={`profile-tab ${activeTab === "repos" ? "active" : ""}`} onClick={() => setActiveTab("repos")}>
            Repositories <span className="tab-badge">{repos.length}</span>
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="profile-overview" role="tabpanel">
            <HeatMapProfile />
            <div className="popular-repos">
              <h3>Popular repositories</h3>
              {repos.length === 0 ? (
                <div className="no-repos">
                  <p>No repositories yet. Create one to get started!</p>
                  <Link to="/create" className="btn-create-repo" style={{marginTop: 8, display: "inline-block"}}>Create a repository</Link>
                </div>
              ) : (
                <div className="repo-grid">
                  {repos.slice(0, 6).map((repo) => (
                    <Link key={repo._id} to={`/repo/${repo._id}`} className="profile-repo-card">
                      <div className="profile-repo-header">
                        <span className="profile-repo-name">{repo.name}</span>
                        <span className="profile-repo-vis">{repo.visibility ? "Public" : "Private"}</span>
                      </div>
                      {repo.description && <p className="profile-repo-desc">{repo.description}</p>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "repos" && (
          <div className="profile-repos-list" role="tabpanel">
            {loading ? (
              <p className="no-repos">Loading...</p>
            ) : repos.length === 0 ? (
              <div className="no-repos">
                <p>No repositories yet.</p>
                <Link to="/create" className="btn-create-repo">Create your first repository</Link>
              </div>
            ) : (
              <ul className="repos-full-list">
                {repos.map((repo) => (
                  <li key={repo._id} className="repos-full-item">
                    <div>
                      <Link to={`/repo/${repo._id}`} className="repos-full-name">{repo.name}</Link>
                      <span className="repos-full-vis">{repo.visibility ? "Public" : "Private"}</span>
                    </div>
                    {repo.description && <p className="repos-full-desc">{repo.description}</p>}
                    <span className="repos-full-date">Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
