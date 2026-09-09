import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProjectsList() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", description: "", client_name: "" });
  const [error, setError] = useState("");

  function load() {
    api.get("/projects").then((r) => setProjects(r.data));
  }

  useEffect(load, []);

  async function createProject(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/projects", form);
      setShowForm(false);
      setForm({ code: "", name: "", description: "", client_name: "" });
      load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create project");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg text-cyan-400 font-medium">Projects</h1>
        {user.role === "manager" && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ New project"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={createProject} className="panel p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Project code</label>
              <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div>
              <label className="label">Client name</label>
              <input className="input" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Project name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <div className="text-rust-500 text-sm">{error}</div>}
          <button className="btn-primary" type="submit">Create project</button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-4">
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="panel p-4 hover:border-cyan-400/60 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-cyan-300 font-semibold">{p.name}</div>
                <div className="text-xs text-cyan-300/50 font-mono">{p.code}</div>
              </div>
              <span className="badge border-cyan-400/40 text-cyan-300">{p.status}</span>
            </div>
            {p.phase_name && (
              <div className="text-xs text-cyan-300/60 mt-2 font-mono">LP{p.phase_number} — {p.phase_name}</div>
            )}
          </Link>
        ))}
        {projects.length === 0 && <div className="text-cyan-300/50 text-sm">No projects yet.</div>}
      </div>
    </div>
  );
}
