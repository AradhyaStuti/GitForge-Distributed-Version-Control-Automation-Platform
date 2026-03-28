import { useState, useEffect } from "react";
import api from "../../api";
import { useAuth } from "../../authContext";
import toast from "react-hot-toast";
import "./security-audit-log.css";

const ACTION_ICONS = {
  login: "\uD83D\uDD13",
  logout: "\uD83D\uDD12",
  key_created: "\uD83D\uDD11",
  key_revoked: "\uD83D\uDDD1\uFE0F",
  key_rotated: "\uD83D\uDD04",
  permission_changed: "\uD83D\uDEE1\uFE0F",
  password_changed: "\uD83D\uDD10",
  profile_updated: "\u270F\uFE0F",
  repo_created: "\uD83D\uDCC1",
  repo_deleted: "\uD83D\uDDD1\uFE0F",
  default: "\uD83D\uDD35",
};

const ACTION_LABELS = {
  login: "Login",
  logout: "Logout",
  key_created: "API Key Created",
  key_revoked: "API Key Revoked",
  key_rotated: "API Key Rotated",
  permission_changed: "Permission Changed",
  password_changed: "Password Changed",
  profile_updated: "Profile Updated",
  repo_created: "Repository Created",
  repo_deleted: "Repository Deleted",
};

const PAGE_SIZE = 20;

const SecurityAuditLog = () => {
  const { currentUser } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterAction, setFilterAction] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchEvents = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page, limit: PAGE_SIZE });
        if (filterAction !== "all") params.append("action", filterAction);
        if (filterDateFrom) params.append("from", filterDateFrom);
        if (filterDateTo) params.append("to", filterDateTo);

        const res = await api.get(`/v1/audit/me?${params}`, { signal: controller.signal });
        if (controller.signal.aborted) return;

        const data = res.data;
        setEvents(data.events || data || []);
        setTotalPages(data.totalPages || Math.ceil((data.total || 0) / PAGE_SIZE) || 1);
      } catch (err) {
        if (err.name === "CanceledError") return;
        toast.error("Failed to load audit log.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchEvents();
    return () => controller.abort();
  }, [page, filterAction, filterDateFrom, filterDateTo]);

  const formatTimestamp = (ts) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  return (
    <div className="sal-page">
      <div className="sal-header">
        <div>
          <h1>Security Audit Log</h1>
          <p className="sal-subtitle">Track all security-related events for your account.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="sal-filters">
        <select
          className="sal-filter-select"
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          aria-label="Filter by action"
        >
          <option value="all">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <div className="sal-date-filters">
          <label className="sal-date-label">
            From
            <input
              type="date"
              className="sal-date-input"
              value={filterDateFrom}
              onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
            />
          </label>
          <label className="sal-date-label">
            To
            <input
              type="date"
              className="sal-date-input"
              value={filterDateTo}
              onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
            />
          </label>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="sal-loading" role="status"><div className="spinner" /><p>Loading events...</p></div>
      ) : events.length === 0 ? (
        <div className="sal-empty">
          <h3>No events found</h3>
          <p>Security events will appear here as they occur.</p>
        </div>
      ) : (
        <div className="sal-timeline">
          <div className="sal-timeline-line" />
          {events.map((event, i) => {
            const icon = ACTION_ICONS[event.action] || ACTION_ICONS.default;
            const isFailure = event.status === "failure" || event.status === "failed";

            return (
              <div key={event._id || i} className={`sal-event ${isFailure ? "sal-event-failure" : ""}`}>
                <div className="sal-event-icon">{icon}</div>
                <div className="sal-event-card">
                  <div className="sal-event-top">
                    <span className="sal-event-action">{ACTION_LABELS[event.action] || event.action}</span>
                    <span className={`sal-event-status sal-status-${event.status || "success"}`}>
                      {event.status === "failure" || event.status === "failed" ? "Failed" : "Success"}
                    </span>
                    <span className="sal-event-time">{formatTimestamp(event.timestamp || event.createdAt)}</span>
                  </div>
                  <div className="sal-event-details">
                    {event.actor && (
                      <span className="sal-detail">
                        <span className="sal-detail-label">Actor:</span> {event.actor.username || event.actor}
                      </span>
                    )}
                    {event.resource && (
                      <span className="sal-detail">
                        <span className="sal-detail-label">Resource:</span> {event.resource}
                      </span>
                    )}
                    {event.ip && (
                      <span className="sal-detail">
                        <span className="sal-detail-label">IP:</span> {event.ip}
                      </span>
                    )}
                    {event.userAgent && (
                      <span className="sal-detail">
                        <span className="sal-detail-label">Device:</span> {event.userAgent}
                      </span>
                    )}
                    {event.description && (
                      <span className="sal-detail sal-detail-desc">{event.description}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="sal-pagination">
          <button
            className="sal-page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="sal-page-info">Page {page} of {totalPages}</span>
          <button
            className="sal-page-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default SecurityAuditLog;
