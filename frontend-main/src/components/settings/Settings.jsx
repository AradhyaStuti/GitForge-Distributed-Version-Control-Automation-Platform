import { useState } from "react";
import api from "../../api";
import { useAuth } from "../../authContext";
import toast from "react-hot-toast";
import "./settings.css";

const Settings = () => {
  const { userDetails, refreshUserDetails, logout } = useAuth();
  const [username, setUsername] = useState(userDetails?.username || "");
  const [email, setEmail] = useState(userDetails?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updates = {};
      if (username !== userDetails?.username) updates.username = username;
      if (email !== userDetails?.email) updates.email = email;
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast.error("Passwords do not match.");
          return;
        }
        if (newPassword.length < 8) {
          toast.error("Password must be at least 8 characters.");
          return;
        }
        updates.password = newPassword;
      }

      if (Object.keys(updates).length === 0) {
        toast("No changes to save.");
        return;
      }

      await api.put(`/updateProfile/${userDetails._id}`, updates);
      await refreshUserDetails();
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== userDetails?.username) {
      toast.error("Please type your username to confirm.");
      return;
    }
    try {
      await api.delete(`/deleteProfile/${userDetails._id}`);
      toast.success("Account deleted.");
      logout();
    } catch {
      toast.error("Failed to delete account.");
    }
  };

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      {/* Profile Settings */}
      <section className="settings-section">
        <h2>Profile</h2>
        <form onSubmit={handleSaveProfile} className="settings-form">
          <div className="settings-field">
            <label htmlFor="s-username">Username</label>
            <input
              id="s-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="settings-field">
            <label htmlFor="s-email">Email</label>
            <input
              id="s-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="settings-field">
            <label htmlFor="s-password">New Password</label>
            <input
              id="s-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
            />
          </div>
          {newPassword && (
            <div className="settings-field">
              <label htmlFor="s-confirm">Confirm Password</label>
              <input
                id="s-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </section>

      {/* Appearance */}
      <section className="settings-section">
        <h2>Appearance</h2>
        <p className="settings-hint">
          Toggle dark/light mode using the theme button in the navbar.
        </p>
      </section>

      {/* Account Info */}
      <section className="settings-section">
        <h2>Account</h2>
        <div className="settings-info">
          <div className="settings-info-row">
            <span className="info-label">User ID</span>
            <span className="info-value">{userDetails?._id}</span>
          </div>
          <div className="settings-info-row">
            <span className="info-label">Joined</span>
            <span className="info-value">{new Date(userDetails?.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="settings-info-row">
            <span className="info-label">Repositories</span>
            <span className="info-value">{userDetails?.repositories?.length || 0}</span>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="settings-section danger-zone">
        <h2>Danger Zone</h2>
        <div className="danger-card">
          <div>
            <strong>Delete Account</strong>
            <p>Once deleted, your account cannot be recovered.</p>
          </div>
          <div className="danger-actions">
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={`Type "${userDetails?.username}" to confirm`}
            />
            <button
              className="btn-delete-account"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== userDetails?.username}
            >
              Delete Account
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
