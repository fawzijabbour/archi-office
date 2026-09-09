import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toLocalDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const EMPTY_FORM = { title: "", project_id: "", start_time: "", end_time: "", location: "", notes: "", attendee_ids: [], recurrence: "none", recurrence_end: "" };

export default function Calendar() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const linkedProjectId = searchParams.get("project_id");
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);

  function loadMeetings() {
    api.get("/meetings", { params: { from: monthStart.toISOString(), to: monthEnd.toISOString() } })
      .then((r) => setMeetings(r.data));
  }

  useEffect(loadMeetings, [cursor]);
  useEffect(() => {
    api.get("/projects").then((r) => setProjects(r.data));
    if (user.role === "manager") api.get("/users").then((r) => setEmployees(r.data));
  }, []);

  useEffect(() => {
    if (!linkedProjectId) return;
    const dateStr = toLocalDateKey(selectedDate);
    setForm((f) => ({ ...f, project_id: linkedProjectId, start_time: `${dateStr}T10:00`, end_time: `${dateStr}T11:00` }));
    setShowForm(true);
  }, [linkedProjectId]);

  const meetingsByDay = useMemo(() => {
    const map = {};
    for (const m of meetings) {
      const key = toLocalDateKey(new Date(m.start_time));
      map[key] = map[key] || [];
      map[key].push(m);
    }
    return map;
  }, [meetings]);

  const gridDays = useMemo(() => {
    const days = [];
    const firstWeekday = monthStart.getDay();
    for (let i = 0; i < firstWeekday; i++) days.push(null);
    for (let d = 1; d <= monthEnd.getDate(); d++) days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    return days;
  }, [cursor]);

  const selectedKey = toLocalDateKey(selectedDate);
  const dayMeetings = (meetingsByDay[selectedKey] || []).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const todayKey = toLocalDateKey(new Date());

  function changeMonth(delta) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }

  function openNewMeeting() {
    const dateStr = toLocalDateKey(selectedDate);
    setForm({ ...EMPTY_FORM, start_time: `${dateStr}T10:00`, end_time: `${dateStr}T11:00` });
    setShowForm(true);
  }

  async function createMeeting(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        recurrence_end: form.recurrence !== "none" ? form.recurrence_end : undefined,
      };
      await api.post("/meetings", payload);
      setShowForm(false);
      loadMeetings();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create meeting");
    }
  }

  async function deleteMeeting(id) {
    await api.delete(`/meetings/${id}`);
    loadMeetings();
  }

  async function downloadIcs(meeting) {
    const res = await api.get(`/meetings/${meeting.id}/ics`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meeting.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function toggleAttendee(id) {
    setForm((f) => ({
      ...f,
      attendee_ids: f.attendee_ids.includes(id) ? f.attendee_ids.filter((a) => a !== id) : [...f.attendee_ids, id],
    }));
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-cyan-400 font-medium">
            {cursor.toLocaleDateString([], { month: "long", year: "numeric" })}
          </div>
          <div className="flex gap-2">
            <button className="btn text-xs" onClick={() => changeMonth(-1)}>← Prev</button>
            <button className="btn text-xs" onClick={() => { setCursor(new Date()); setSelectedDate(new Date()); }}>Today</button>
            <button className="btn text-xs" onClick={() => changeMonth(1)}>Next →</button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-xs text-cyan-400/60 mb-1">
          {DAY_NAMES.map((d) => <div key={d} className="text-center py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-navy-600/15 rounded-md overflow-hidden">
          {gridDays.map((day, i) => {
            if (!day) return <div key={i} className="bg-navy-900 min-h-20" />;
            const key = toLocalDateKey(day);
            const count = (meetingsByDay[key] || []).length;
            const isSelected = key === selectedKey;
            const isToday = key === todayKey;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`bg-navy-900 min-h-20 p-1.5 text-left hover:bg-navy-800 transition-colors ${isSelected ? "ring-1 ring-inset ring-cyan-400" : ""}`}
              >
                <div className={`text-xs font-mono ${isToday ? "text-cyan-400 font-semibold" : "text-cyan-300/60"}`}>
                  {day.getDate()}
                </div>
                {count > 0 && (
                  <div className="mt-1 text-[11px] text-cyan-300/70 leading-tight">
                    {count} {count === 1 ? "meeting" : "meetings"}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-cyan-400 font-medium">
              {selectedDate.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
            </div>
            <button className="btn text-xs" onClick={openNewMeeting}>+ Meeting</button>
          </div>

          {dayMeetings.length === 0 ? (
            <div className="text-cyan-300/50 text-sm">No meetings this day.</div>
          ) : (
            <ul className="space-y-3">
              {dayMeetings.map((m) => (
                <li key={`${m.id}-${m.start_time}`} className="hr pt-3 first:border-t-0 first:pt-0">
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-medium">
                      {m.title}
                      {m.recurrence && m.recurrence !== "none" && (
                        <span className="ml-1.5 text-xs text-cyan-300/40 font-normal">↻ {m.recurrence}</span>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => downloadIcs(m)} className="text-xs text-cyan-400/70 hover:text-cyan-400">.ics</button>
                      {(user.role === "manager" || m.created_by === user.id) && (
                        <button onClick={() => deleteMeeting(m.id)} className="text-xs text-rust-500/70 hover:text-rust-500">remove</button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-cyan-300/50 font-mono mt-0.5">
                    {new Date(m.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {"–"}
                    {new Date(m.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {m.location && ` · ${m.location}`}
                  </div>
                  {m.project_name && <div className="text-xs text-cyan-300/50 mt-0.5">{m.project_code} — {m.project_name}</div>}
                  {m.attendees?.length > 0 && (
                    <div className="text-xs text-cyan-300/40 mt-0.5">{m.attendees.map((a) => a.full_name).join(", ")}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {showForm && (
          <form onSubmit={createMeeting} className="panel p-5 space-y-3">
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start</label>
                <input className="input" type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
              </div>
              <div>
                <label className="label">End</label>
                <input className="input" type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="label">Project (optional)</label>
              <select className="input" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Office, site, client, video call..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Repeats</label>
                <select className="input" value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
                  <option value="none">Doesn't repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {form.recurrence !== "none" && (
                <div>
                  <label className="label">Until</label>
                  <input className="input" type="date" value={form.recurrence_end} onChange={(e) => setForm({ ...form, recurrence_end: e.target.value })} required />
                </div>
              )}
            </div>
            {user.role === "manager" && employees.length > 0 && (
              <div>
                <label className="label">Attendees</label>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-navy-600/30 rounded-md p-2">
                  {employees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.attendee_ids.includes(e.id)} onChange={() => toggleAttendee(e.id)} />
                      {e.full_name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {error && <div className="text-rust-500 text-sm">{error}</div>}
            <div className="flex gap-2">
              <button className="btn-primary text-sm" type="submit">Save meeting</button>
              <button className="btn text-sm" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
