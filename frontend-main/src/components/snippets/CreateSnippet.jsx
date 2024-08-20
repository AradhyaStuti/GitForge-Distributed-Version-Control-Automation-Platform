import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
import "./snippets.css";

const CreateSnippet = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([{ filename: "", language: "plaintext", content: "" }]);
  const [visibility, setVisibility] = useState(true);
  const [loading, setLoading] = useState(false);

  const updateFile = (i, field, value) => {
    const updated = [...files];
    updated[i][field] = value;
    setFiles(updated);
  };

  const addFile = () => setFiles([...files, { filename: "", language: "plaintext", content: "" }]);
  const removeFile = (i) => { if (files.length > 1) setFiles(files.filter((_, idx) => idx !== i)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validFiles = files.filter((f) => f.filename && f.content);
    if (validFiles.length === 0) { toast.error("Add at least one file with name and content."); return; }
    try {
      setLoading(true);
      const res = await api.post("/snippet/create", { title: title || "Untitled snippet", description, files: validFiles, visibility });
      toast.success("Snippet created!");
      navigate(`/snippet/${res.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create snippet.");
    } finally { setLoading(false); }
  };

  return (
    <div className="create-snippet-page">
      <h1>Create new snippet</h1>
      <form onSubmit={handleSubmit} className="snip-form">
        <div className="snip-form-row">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Snippet title (optional)" className="snip-input" />
          <select value={visibility} onChange={(e) => setVisibility(e.target.value === "true")} className="snip-select">
            <option value="true">Public</option>
            <option value="false">Secret</option>
          </select>
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="snip-textarea" rows={2} />

        {files.map((file, i) => (
          <div key={i} className="snip-file-block">
            <div className="snip-file-header">
              <input type="text" value={file.filename} onChange={(e) => updateFile(i, "filename", e.target.value)} placeholder="Filename with extension" className="snip-input snip-file-name" />
              <input type="text" value={file.language} onChange={(e) => updateFile(i, "language", e.target.value)} placeholder="Language" className="snip-input snip-file-lang" />
              {files.length > 1 && <button type="button" className="snip-file-remove" onClick={() => removeFile(i)}>Remove</button>}
            </div>
            <textarea value={file.content} onChange={(e) => updateFile(i, "content", e.target.value)} placeholder="Paste your code here..." className="snip-code-editor" rows={10} />
          </div>
        ))}

        <button type="button" className="snip-btn-add-file" onClick={addFile}>+ Add another file</button>

        <div className="snip-form-actions">
          <button type="submit" className="snip-btn-new" disabled={loading}>
            {loading ? "Creating..." : "Create snippet"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSnippet;
