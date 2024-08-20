import { useState, useEffect, useRef } from "react";
import api from "../api";
import { useAuth } from "../authContext";
import toast from "react-hot-toast";
import "./notification-bell.css";

const NotificationBell = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;

    const controller = new AbortController();

    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications?limit=10", { signal: controller.signal });
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
        setFetchError(false);
      } catch (err) {
        if (err.name === "CanceledError") return;
        console.warn("Notification fetch failed:", err.message);
        setFetchError(true);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [currentUser]);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      toast.error("Failed to mark notifications as read.");
      console.warn("Mark all read failed:", err.message);
    }
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="bell-button"
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 16a2 2 0 0 0 1.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 0 0 8 16ZM3 5a5 5 0 0 1 10 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.519 1.519 0 0 1 13.482 13H2.518a1.516 1.516 0 0 1-1.263-2.36l1.703-2.554A.255.255 0 0 0 3 7.947Zm5-3.5A3.5 3.5 0 0 0 4.5 5v2.947c0 .346-.102.683-.294.97l-1.703 2.556a.017.017 0 0 0-.003.01l.001.006c0 .002.002.004.004.006l.006.004.007.001h10.964l.007-.001.006-.004.004-.006.001-.007a.017.017 0 0 0-.003-.01l-1.703-2.554a1.745 1.745 0 0 1-.294-.97V5A3.5 3.5 0 0 0 8 1.5Z"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="bell-badge" aria-hidden="true">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown" role="menu" aria-label="Notifications">
          <div className="notification-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="mark-all-btn" onClick={markAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          {fetchError ? (
            <div className="notification-empty">Could not load notifications.</div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">No notifications</div>
          ) : (
            <ul className="notification-list">
              {notifications.map((n) => (
                <li key={n._id} className={`notification-item ${n.read ? "" : "unread"}`}>
                  <p className="notification-msg">{n.message}</p>
                  <span className="notification-time">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
