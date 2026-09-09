import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/client";

export default function ManagerDashboard() {
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState([]);
  const [pendingVacations, setPendingVacations] = useState([]);
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    api.get("/users").then((r) => setEmployees(r.data));
    api.get("/projects").then((r) => setProjects(r.data));
    api.get("/attendance/summary").then((r) => setAttendanceToday(r.data));
    api.get("/vacation?status=pending").then((r) => setPendingVacations(r.data));
    const now = new Date().toISOString();
    api.get("/meetings", { params: { from: now } }).then((r) => setMeetings(r.data.slice(0, 4)));
  }, []);

  const activeProjects = projects.filter((p) => p.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Employees" value={employees.length} />
        <StatCard label="Active projects" value={activeProjects} />
        <StatCard label="Checked in today" value={new Set(attendanceToday.filter(a => a.event_type === "check_in").map(a => a.employee_id)).size} />
        <StatCard label="Pending vacation" value={pendingVacations.length} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 panel">
          <div className="panel-header">Today's attendance log</div>
          <div className="px-5 pb-5">
            {attendanceToday.length === 0 ? (
              <div className="text-cyan-300/50 text-sm">No attendance events yet today.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-cyan-400/70 text-xs text-left">
                    <th className="pb-2 font-normal">Employee</th>
                    <th className="pb-2 font-normal">Event</th>
                    <th className="pb-2 font-normal">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceToday.map((a, i) => (
                    <tr key={i} className="hr">
                      <td className="py-2">{a.full_name}</td>
                      <td className="py-2">{a.event_type.replace("_", " ")}</td>
                      <td className="py-2 text-cyan-300/60 font-mono text-xs">{new Date(a.event_time).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel">
            <div className="panel-header">
              <span>Pending vacation</span>
              <Link to="/vacation" className="text-xs text-cyan-400 hover:underline">All requests</Link>
            </div>
            <div className="px-5 pb-5">
              {pendingVacations.length === 0 ? (
                <div className="text-cyan-300/50 text-sm">Nothing pending.</div>
              ) : (
                <ul>
                  {pendingVacations.map((v) => (
                    <li key={v.id} className="hr py-2 first:border-t-0 first:pt-0">
                      <div className="text-sm">{v.employee_name}</div>
                      <div className="text-cyan-300/50 text-xs font-mono">{v.start_date} → {v.end_date}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="panel p-4">
      <div className="text-xs text-cyan-400/70">{label}</div>
      <div className="text-3xl font-semibold text-cyan-400 mt-1 font-mono">{value}</div>
    </div>
  );
}
