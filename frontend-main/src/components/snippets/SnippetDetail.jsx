import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../authContext";
import toast from "react-hot-toast";
import "./snippets.css";

const SnippetDetail = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [snippet, setSnippet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/snippet/${id}`).then((r) => setSnippet(r.data)).catch(() => toast.error("Failed to load snippet.")).finally(() => setLoading(false));
  }, [id]);

  const handleStar = async () => {
    try {
      const starred = snippet.stars?.includes(currentUser);
      if (starred) { await api.delete(`/snippet/${id}/star`); }
      else { await api.post(`/snippet/${id}/star`); }
      const res = await api.get(`/snippet/${id}`);
      setSnippet(res.data);
      toast.success(starred ? "Unstarred" : "Starred!");
    } catch (err) { toast.error(err.response?.data?.message || "Action failed."); }
  };

  const handleFork = async () => {
    try {
      const res = await api.post(`/snippet/${id}/fork`);
      toast.success("Snippet forked!");
      window.location.href = `/snippet/${res.data._id}`;
    } catch (err) { toast.error(err.response?.data?.message || "Fork failed."); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (loading) return <div className="snip-loading">Loading...</div>;
  if (!snippet) return <div className="snip-empty"><h3>Snippet not found</h3><Link to="/snippets">Back to snippets</Link></div>;

  const isOwner = snippet.author?._id === currentUser;

  return (
    <div className="snippet-detail">
      <div className="snippet-detail-header">
        <div>
          <h1>{snippet.title || "Untitled snippet"}</h1>
          <div className="snippet-meta-row">
            <span>{snippet.author?.username}</span>
            <span>{snippet.visibility ? "Public" : "Secret"}</span>
            <span>{snippet.viewCount} views</span>
            <span>{snippet.stars?.length || 0} stars</span>
            <span>{snippet.forkCount} forks</span>
            <span>{new Date(snippet.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="snippet-actions">
          {!isOwner && (
            <>
              <button className="snip-action-btn" onClick={handleStar}>
                {snippet.stars?.includes(currentUser) ? "Unstar" : "Star"}
              </button>
              <button className="snip-action-btn" onClick={handleFork}>Fork</button>
            </>
          )}
          {snippet.forkOf && <span className="snip-fork-badge">Forked from {snippet.forkOf.title}</span>}
        </div>
      </div>

      {snippet.description && <p className="snippet-desc">{snippet.description}</p>}

      <div className="snippet-files">
        {snippet.files?.map((file, i) => (
          <div key={i} className="snippet-file">
            <div className="snippet-file-header">
              <span className="snippet-filename">{file.filename}</span>
              <span className="snippet-lang">{file.language}</span>
              <button className="snip-copy-btn" onClick={() => copyToClipboard(file.content)}>Copy</button>
            </div>
            <pre className="snippet-code"><code>{file.content}</code></pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SnippetDetail;
