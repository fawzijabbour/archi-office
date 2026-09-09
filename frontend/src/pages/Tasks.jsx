import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignee_id: "", due_date: "" });
  const [error, setError] = useState("");

  function load() {
    const endpoint = user.role === "manager" ? "/tasks" : "/tasks/mine";
    api.get(endpoint).then((r) => setTasks(r.data));
    if (user.role === "manager") api.get("/users").then((r) => setEmployees(r.data));
  }

  useEffect(load, []);

  async function createTask(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/tasks", form);
      setForm({ title: "", description: "", assignee_id: "", due_date: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create task");
    }
  }

  async function updateStatus(id, status) {
    await api.patch(`/tasks/${id}/status`, { status });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg text-cyan-400 font-medium">Tasks</h1>
        {user.role === "manager" && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ New task"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={createTask} className="panel p-5 space-y-4 max-w-lg">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Assign to</label>
              <select className="input" value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })} required>
                <option value="">Select employee...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Due date</label>
              <input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          {error && <div className="text-rust-500 text-sm">{error}</div>}
          <button className="btn-primary" type="submit">Create task</button>
        </form>
      )}

      <div className="panel">
        <div className="panel-header">{user.role === "manager" ? "All tasks" : "My tasks"}</div>
        <div className="p-4">
          {tasks.length === 0 ? (
            <div className="text-cyan-300/50 text-sm">No tasks.</div>
          ) : (
            <ul className="space-y-3">
              {tasks.map((t) => (
                <li key={t.id} className="border-b border-navy-700 pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-semibold">{t.title}</div>
                      {t.description && <div className="text-xs text-cyan-300/50">{t.description}</div>}
                      <div className="text-xs text-cyan-300/40 mt-1">
                        {user.role === "manager" && (t.assignee_name || t.group_name)}
                        {t.due_date && ` · due ${t.due_date}`}
                      </div>
                    </div>
                    {user.role === "manager" ? (
                      <span className={`badge ${statusColor(t.status)}`}>{t.status}</span>
                    ) : (
                      <select className="input text-xs w-auto" value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)}>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function statusColor(status) {
  switch (status) {
    case "done": return "border-green-400/40 text-green-300";
    case "in_progress": return "border-yellow-400/40 text-yellow-300";
    default: return "border-cyan-400/40 text-cyan-300";
  }
}
