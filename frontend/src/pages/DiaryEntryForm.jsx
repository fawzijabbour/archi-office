import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export default function DiaryEntryForm() {
  const [projects, setProjects] = useState([]);
  const [phases, setPhases] = useState([]);
  const [form, setForm] = useState({
    project_id: "",
    phase_id: "",
    entry_date: new Date().toISOString().slice(0, 10),
    time_from: "",
    time_to: "",
    location: "office",
    description: "",
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/projects").then((r) => setProjects(r.data));
    api.get("/phases").then((r) => setPhases(r.data));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      if (file) data.append("file", file);
      await api.post("/diary", data, { headers: { "Content-Type": "multipart/form-data" } });
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save entry");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel max-w-2xl">
      <div className="panel-header">New Work Diary Entry</div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Project</label>
            <select className="input" value={form.project_id} onChange={(e) => update("project_id", e.target.value)} required>
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Phase (Leistungsphase)</label>
            <select className="input" value={form.phase_id} onChange={(e) => update("phase_id", e.target.value)} required>
              <option value="">Select phase...</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>LP{p.number} — {p.name_en}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={form.entry_date} onChange={(e) => update("entry_date", e.target.value)} required />
          </div>
          <div>
            <label className="label">From</label>
            <input className="input" type="time" value={form.time_from} onChange={(e) => update("time_from", e.target.value)} required />
          </div>
          <div>
            <label className="label">To</label>
            <input className="input" type="time" value={form.time_to} onChange={(e) => update("time_to", e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="label">Location</label>
          <select className="input" value={form.location} onChange={(e) => update("location", e.target.value)}>
            <option value="office">Office</option>
            <option value="site">Construction Site</option>
            <option value="client">Client Location</option>
            <option value="home">Home Office</option>
          </select>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Brief note about the work performed..." />
        </div>

        <div>
          <label className="label">Attach file (optional)</label>
          <input className="input" type="file" onChange={(e) => setFile(e.target.files[0])} />
        </div>

        {error && <div className="text-rust-500 text-sm">{error}</div>}

        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? "Saving..." : "Save entry"}
        </button>
      </form>
    </div>
  );
}
