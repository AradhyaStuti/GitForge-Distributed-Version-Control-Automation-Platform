import { useState, useEffect } from "react";
import api from "../../api";
import { useAuth } from "../../authContext";
import toast from "react-hot-toast";
import "./api-key-manager.css";

const SCOPE_OPTIONS = [
  { value: "repo:read", label: "Read repositories" },
  { value: "repo:write", label: "Write repositories" },
  { value: "issue:read", label: "Read issues" },
  { value: "issue:write", label: "Write issues" },
  { value: "pr:read", label: "Read pull requests" },
  { value: "pr:write", label: "Write pull requests" },
  { value: "pipeline:trigger", label: "Trigger pipelines" },
  { value: "admin", label: "Admin access" },
];

const EXPIRY_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "1 year" },
  { value: "never", label: "No expiration" },
];

const APIKeyManager = () => {
  useAuth();

  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState([]);
  const [newKeyExpiry, setNewKeyExpiry] = useState("90");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchKeys = async () => {
      try {
        const res = await api.get("/v1/api-keys", { signal: controller.signal });
        if (controller.signal.aborted) return;
        setKeys(res.data?.keys || res.data || []);
      } catch (err) {
        if (err.name === "CanceledError") return;
        toast.error("Failed to load API keys.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchKeys();
    return () => controller.abort();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name.");
      return;
    }
    if (newKeyScopes.length === 0) {
      toast.error("Please select at least one scope.");
      return;
    }

    try {
      setCreating(true);
      const res = await api.post("/v1/api-keys", {
        name: newKeyName,
        scopes: newKeyScopes,
        expiresIn: newKeyExpiry === "never" ? null : parseInt(newKeyExpiry),
      });
      setRevealedKey(res.data.key || res.data.token);
      setKeys((prev) => [res.data.apiKey || res.data, ...prev]);
      setNewKeyName("");
      setNewKeyScopes([]);
      setNewKeyExpiry("90");
      setShowCreate(false);
      toast.success("API key created!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create API key.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyKey = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey).then(() => {
      setCopied(true);
      toast.success("Key copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRevoke = async (keyId) => {
    try {
      await api.delete(`/v1/api-keys/${keyId}`);
      setKeys((prev) => prev.filter((k) => k._id !== keyId));
      setConfirmRevoke(null);
      toast.success("API key revoked.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to revoke key.");
    }
  };

  const handleRotate = async (keyId) => {
    try {
      const res = await api.post(`/v1/api-keys/${keyId}/rotate`);
      setRevealedKey(res.data.key || res.data.token);
      setKeys((prev) => prev.map((k) => k._id === keyId ? { ...k, ...res.data.apiKey } : k));
      toast.success("Key rotated! Save the new key.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to rotate key.");
    }
  };

  const toggleScope = (scope) => {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  if (loading) {
    return (
      <div className="ak-page">
        <div className="ak-loading" role="status"><div className="spinner" /><p>Loading API keys...</p></div>
      </div>
    );
  }

  return (
    <div className="ak-page">
      <div className="ak-header">
        <div>
          <h1>API Keys</h1>
          <p className="ak-subtitle">Manage your personal access tokens for API authentication.</p>
        </div>
        <button className="ak-create-btn" onClick={() => setShowCreate(!showCreate)}>+ New Key</button>
      </div>

      {/* Revealed Key Warning */}
      {revealedKey && (
        <div className="ak-reveal-banner">
          <div className="ak-reveal-warning">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575ZM8 5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>
            <strong>Copy your API key now.</strong> You will not be able to see it again.
          </div>
          <div className="ak-reveal-key-wrap">
            <code className="ak-reveal-key">{revealedKey}</code>
            <button className={`ak-copy-btn ${copied ? "ak-copied" : ""}`} onClick={handleCopyKey}>
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>
              ) : (
                "Copy"
              )}
            </button>
          </div>
          <button className="ak-dismiss-btn" onClick={() => setRevealedKey(null)}>Dismiss</button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <form className="ak-create-form" onSubmit={handleCreate}>
          <h3>Create New API Key</h3>
          <div className="ak-field">
            <label htmlFor="ak-name">Key Name</label>
            <input
              id="ak-name"
              type="text"
              placeholder="e.g., CI/CD Pipeline"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="ak-input"
              autoFocus
            />
          </div>
          <div className="ak-field">
            <label>Scopes</label>
            <div className="ak-scopes-grid">
              {SCOPE_OPTIONS.map((scope) => (
                <label key={scope.value} className={`ak-scope-item ${newKeyScopes.includes(scope.value) ? "ak-scope-active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={newKeyScopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                  />
                  <span>{scope.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="ak-field">
            <label htmlFor="ak-expiry">Expiration</label>
            <select
              id="ak-expiry"
              value={newKeyExpiry}
              onChange={(e) => setNewKeyExpiry(e.target.value)}
              className="ak-select"
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="ak-form-actions">
            <button type="submit" className="ak-create-btn" disabled={creating}>
              {creating ? "Creating..." : "Create Key"}
            </button>
            <button type="button" className="ak-cancel-btn" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Key List */}
      {keys.length === 0 ? (
        <div className="ak-empty">
          <h3>No API keys</h3>
          <p>Create a personal access token to authenticate with the GitForge API.</p>
        </div>
      ) : (
        <div className="ak-key-list">
          {keys.map((key) => (
            <div key={key._id} className="ak-key-card">
              <div className="ak-key-info">
                <div className="ak-key-top">
                  <span className="ak-key-name">{key.name}</span>
                  <span className="ak-key-prefix">{key.prefix || "gf_****"}</span>
                </div>
                <div className="ak-key-scopes">
                  {(key.scopes || []).map((scope, i) => (
                    <span key={i} className="ak-scope-badge">{scope}</span>
                  ))}
                </div>
                <div className="ak-key-meta">
                  <span>Created: {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : "—"}</span>
                  <span>Last used: {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : "Never"}</span>
                  <span>Expires: {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : "Never"}</span>
                  {key.usageCount != null && <span>Usage: {key.usageCount} requests</span>}
                </div>
              </div>
              <div className="ak-key-actions">
                <button className="ak-rotate-btn" onClick={() => handleRotate(key._id)} title="Rotate key">Rotate</button>
                {confirmRevoke === key._id ? (
                  <div className="ak-confirm-revoke">
                    <span className="ak-confirm-text">Are you sure?</span>
                    <button className="ak-revoke-confirm" onClick={() => handleRevoke(key._id)}>Yes, revoke</button>
                    <button className="ak-revoke-cancel" onClick={() => setConfirmRevoke(null)}>Cancel</button>
                  </div>
                ) : (
                  <button className="ak-revoke-btn" onClick={() => setConfirmRevoke(key._id)}>Revoke</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default APIKeyManager;
