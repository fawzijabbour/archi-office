import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import api from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [today, setToday] = useState([]);
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    api.get("/attendance/today").then((r) => setToday(r.data));
    const now = new Date().toISOString();
    api.get("/meetings", { params: { from: now } }).then((r) => setMeetings(r.data.slice(0, 4)));
  }, []);

  const scanUrl = user ? `${window.location.origin}/scan?token=${user.qr_token}` : "";

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <div className="panel">
          <div className="panel-header">Your attendance QR code</div>
          <div className="px-5 pb-5 flex items-center gap-6 flex-wrap">
            <div className="bg-white p-3 border border-navy-600/25 rounded-md">
              {user && <QRCode value={scanUrl} size={130} />}
            </div>
            <div className="text-sm text-cyan-300/70 max-w-sm">
              Scan this with your phone, or a wall-mounted kiosk, each time you come in,
              take a pause, resume, or leave for the day.
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">Today's log</div>
          <div className="px-5 pb-5">
            {today.length === 0 ? (
              <div className="text-cyan-300/50 text-sm">No attendance events yet today.</div>
            ) : (
              <ul>
                {today.map((t, i) => (
                  <li key={i} className="flex justify-between text-sm hr py-2 first:border-t-0 first:pt-0">
                    <span>{t.event_type.replace("_", " ")}</span>
                    <span className="text-cyan-300/60 font-mono text-xs">
                      {new Date(t.event_time).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="panel">
          <div className="panel-header">
            <span>Upcoming</span>
            <Link to="/calendar" className="text-xs text-cyan-400 hover:underline">Calendar</Link>
          </div>
          <div className="px-5 pb-5">
            {meetings.length === 0 ? (
              <div className="text-cyan-300/50 text-sm">No upcoming meetings.</div>
            ) : (
              <ul>
                {meetings.map((m) => (
                  <li key={m.id} className="hr py-2 first:border-t-0 first:pt-0">
                    <div className="text-sm">{m.title}</div>
                    <div className="text-xs text-cyan-300/50 font-mono mt-0.5">
                      {new Date(m.start_time).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="panel p-5">
          <div className="text-sm text-cyan-300/70 mb-3">Log your work</div>
          <Link to="/diary/new" className="btn-primary w-full block text-center">+ New journal entry</Link>
        </div>
      </div>
    </div>
  );
}
