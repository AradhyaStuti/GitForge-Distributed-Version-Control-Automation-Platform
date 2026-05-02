import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
import "./bookmarks.css";

const Bookmarks = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/bookmarks").then((r) => setBookmarks(r.data || [])).catch(() => toast.error("Failed to load bookmarks.")).finally(() => setLoading(false));
  }, []);

  const remove = async (id) => {
    try {
      await api.delete(`/bookmark/${id}`);
      setBookmarks(bookmarks.filter((b) => b._id !== id));
      toast.success("Bookmark removed.");
    } catch { toast.error("Failed to remove."); }
  };

  return (
    <div className="bookmarks-page">
      <div className="bookmarks-header">
        <h1>Bookmarks</h1>
        <p>Your saved repositories and snippets for quick access.</p>
      </div>

      {loading ? <div className="bm-loading">Loading...</div> : bookmarks.length === 0 ? (
        <div className="bm-empty">
          <svg width="48" height="48" viewBox="0 0 16 16" fill="var(--color-text-secondary)" opacity="0.3"><path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.751.751 0 0 1 3 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.91l3.023-2.489a.75.75 0 0 1 .954 0l3.023 2.49V2.75a.25.25 0 0 0-.25-.25Z" /></svg>
          <h3>No bookmarks yet</h3>
          <p>Bookmark repositories and snippets to find them quickly.</p>
          <Link to="/explore" className="bm-btn">Explore Gitless Forge</Link>
        </div>
      ) : (
        <div className="bm-list">
          {bookmarks.map((bm) => (
            <div key={bm._id} className="bm-card">
              {bm.repository && (
                <Link to={`/repo/${bm.repository._id}`} className="bm-card-link">
                  <span className="bm-type">Repo</span>
                  <span className="bm-card-name">{bm.repository.owner?.username}/{bm.repository.name}</span>
                  {bm.repository.description && <p className="bm-card-desc">{bm.repository.description}</p>}
                </Link>
              )}
              {bm.snippet && (
                <Link to={`/snippet/${bm.snippet._id}`} className="bm-card-link">
                  <span className="bm-type">Snippet</span>
                  <span className="bm-card-name">{bm.snippet.title || "Untitled"}</span>
                </Link>
              )}
              <button className="bm-remove" onClick={() => remove(bm._id)} title="Remove bookmark">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookmarks;
