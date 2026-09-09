import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  function load() {
    api.get("/notifications/mine").then((r) => setNotifications(r.data));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function openNotification(n) {
    if (!n.is_read) {
      await api.patch(`/notifications/${n.id}/read`);
      load();
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full border border-navy-600/30 text-cyan-300/80 hover:text-cyan-300 hover:border-cyan-400/50 hover:bg-navy-800 transition-colors"
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rust-500 text-navy-950 text-[10px] font-mono flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-navy-900 border border-navy-600/30 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-navy-600/25">
            <span className="text-sm text-cyan-400">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-cyan-300/60 hover:text-cyan-300 underline">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-cyan-300/50 text-center">Nothing yet.</div>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={`px-4 py-3 text-sm border-b border-navy-600/15 cursor-pointer hover:bg-navy-800 ${
                    n.is_read ? "text-cyan-300/50" : "text-cyan-300"
                  }`}
                >
                  <div>{n.message}</div>
                  <div className="text-xs text-cyan-300/40 font-mono mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
