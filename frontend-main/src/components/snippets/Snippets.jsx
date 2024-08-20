import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../authContext";
import toast from "react-hot-toast";
import "./snippets.css";

const Snippets = () => {
  const { currentUser } = useAuth();
  const [snippets, setSnippets] = useState([]);
  const [tab, setTab] = useState("discover");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const url = tab === "mine" ? `/snippet/user/${currentUser}` : "/snippets?sort=recent";
        const res = await api.get(url);
        setSnippets(res.data.snippets || []);
      } catch { toast.error("Failed to load snippets."); }
      finally { setLoading(false); }
    };
    fetch();
  }, [tab, currentUser]);

  return (
    <div className="snippets-page">
      <div className="snippets-header">
        <div>
          <h1>Code Snippets</h1>
          <p>Share code, notes, and config files. Like Gists, but better.</p>
        </div>
        <Link to="/snippets/new" className="snip-btn-new">+ New Snippet</Link>
      </div>

      <div className="snip-tabs">
        <button className={`snip-tab ${tab === "discover" ? "active" : ""}`} onClick={() => setTab("discover")}>Discover</button>
        <button className={`snip-tab ${tab === "mine" ? "active" : ""}`} onClick={() => setTab("mine")}>My Snippets</button>
      </div>

      {loading ? (
        <div className="snip-loading">Loading...</div>
      ) : snippets.length === 0 ? (
        <div className="snip-empty">
          <h3>{tab === "mine" ? "You haven't created any snippets" : "No snippets yet"}</h3>
          <p>Snippets let you share code fragments, configs, and notes.</p>
          <Link to="/snippets/new" className="snip-btn-new" style={{ marginTop: 12 }}>Create your first snippet</Link>
        </div>
      ) : (
        <div className="snip-list">
          {snippets.map((s) => (
            <Link to={`/snippet/${s._id}`} key={s._id} className="snip-card">
              <div className="snip-card-top">
                <span className="snip-card-title">{s.title || "Untitled"}</span>
                <span className="snip-card-vis">{s.visibility ? "Public" : "Secret"}</span>
              </div>
              {s.description && <p className="snip-card-desc">{s.description}</p>}
              <div className="snip-card-meta">
                <span>{s.author?.username}</span>
                <span>{s.files?.length || 0} file{s.files?.length !== 1 ? "s" : ""}</span>
                <span>{s.stars?.length || 0} stars</span>
                <span>{new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
              {s.files?.[0] && (
                <pre className="snip-card-preview">{s.files[0].content?.slice(0, 200)}{s.files[0].content?.length > 200 ? "..." : ""}</pre>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Snippets;
