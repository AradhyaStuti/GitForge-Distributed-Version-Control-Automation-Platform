import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
import "./pr.css";

const CreatePR = () => {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState("main");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/repo/${repoId}`).then((r) => setRepo(r.data)).catch(() => {
      toast.error("Failed to load repository.");
    });
  }, [repoId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !sourceBranch) {
      toast.error("Title and source branch are required.");
      return;
    }
    if (sourceBranch === targetBranch) {
      toast.error("Source and target branches must be different.");
      return;
    }
    try {
      setLoading(true);
      const res = await api.post("/pr/create", {
        title,
        description,
        repository: repoId,
        sourceBranch,
        targetBranch,
      });
      toast.success("Pull request created!");
      navigate(`/pr/${res.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create PR.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-pr-page">
      <div className="create-pr-header">
        <Link to={`/repo/${repoId}/pulls`} className="pr-back-link">
          {repo?.owner?.username}/{repo?.name} / Pull Requests
        </Link>
        <h2>New Pull Request</h2>
      </div>

      <form onSubmit={handleSubmit} className="create-pr-form">
        <div className="pr-branch-selectors">
          <div className="pr-branch-field">
            <label>Base branch</label>
            <input
              type="text"
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              placeholder="main"
            />
          </div>
          <span className="pr-arrow">←</span>
          <div className="pr-branch-field">
            <label>Compare branch</label>
            <input
              type="text"
              value={sourceBranch}
              onChange={(e) => setSourceBranch(e.target.value)}
              placeholder="feature-branch"
            />
          </div>
        </div>

        <div className="pr-form-field">
          <label htmlFor="pr-title">Title</label>
          <input
            id="pr-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What does this PR do?"
          />
        </div>

        <div className="pr-form-field">
          <label htmlFor="pr-desc">Description</label>
          <textarea
            id="pr-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your changes..."
            rows={8}
          />
        </div>

        <div className="pr-form-actions">
          <button type="submit" className="btn-create-pr" disabled={loading}>
            {loading ? "Creating..." : "Create Pull Request"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePR;
