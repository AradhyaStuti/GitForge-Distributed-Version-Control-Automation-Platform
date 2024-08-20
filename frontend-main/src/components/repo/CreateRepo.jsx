import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
import "./repo.css";

const CreateRepo = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Repository name is required.");
      return;
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
      setError("Repository name can only contain letters, numbers, hyphens, dots, and underscores.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/repo/create", { name, description, visibility });
      toast.success("Repository created!");
      navigate(`/repo/${res.data.repository._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create repository.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-repo-wrapper">
      <div className="create-repo-card">
        <h1>Create a new repository</h1>
        <p className="create-repo-subtitle">
          A repository contains all project files, including the revision history.
        </p>

        {error && <div className="repo-error">{error}</div>}

        <form onSubmit={handleSubmit} className="create-repo-form">
          <div className="form-field">
            <label htmlFor="repo-name">Repository name *</label>
            <input
              id="repo-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-awesome-project"
              autoFocus
            />
          </div>

          <div className="form-field">
            <label htmlFor="repo-desc">Description (optional)</label>
            <input
              id="repo-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of your repository"
            />
          </div>

          <div className="form-field">
            <div className="visibility-options">
              <label className={`visibility-option ${visibility ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility}
                  onChange={() => setVisibility(true)}
                />
                <div>
                  <strong>Public</strong>
                  <p>Anyone on the internet can see this repository.</p>
                </div>
              </label>
              <label className={`visibility-option ${!visibility ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="visibility"
                  checked={!visibility}
                  onChange={() => setVisibility(false)}
                />
                <div>
                  <strong>Private</strong>
                  <p>You choose who can see and commit to this repository.</p>
                </div>
              </label>
            </div>
          </div>

          <hr className="form-divider" />

          <button type="submit" className="btn-create" disabled={loading}>
            {loading ? "Creating..." : "Create repository"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRepo;
