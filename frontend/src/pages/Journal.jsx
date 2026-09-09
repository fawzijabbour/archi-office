import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dateFilter, setDateFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  useEffect(() => {
    api.get("/projects").then((r) => setProjects(r.data));
  }, []);

  useEffect(() => {
    const params = {};
    if (dateFilter) params.date = dateFilter;
    api.get("/diary/mine", { params }).then((r) => setEntries(r.data));
  }, [dateFilter]);

  const visible = projectFilter ? entries.filter((e) => e.project_id === projectFilter) : entries;

  const totalHours = visible.reduce((sum, e) => {
    const [fh, fm] = e.time_from.split(":").map(Number);
    const [th, tm] = e.time_to.split(":").map(Number);
    return sum + (th * 60 + tm - (fh * 60 + fm)) / 60;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg text-cyan-400 font-medium">Journal</h1>
        <Link to="/diary/new" className="btn-primary text-sm">+ New entry</Link>
      </div>

      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>
        <div>
          <label className="label">Project</label>
          <select className="input" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>
        </div>
        {(dateFilter || projectFilter) && (
          <button className="btn text-sm" onClick={() => { setDateFilter(""); setProjectFilter(""); }}>
            Clear filters
          </button>
        )}
        <div className="ml-auto text-sm text-cyan-300/60">
          {visible.length} {visible.length === 1 ? "entry" : "entries"} · <span className="font-mono">{totalHours.toFixed(1)}h</span>
        </div>
      </div>

      <div className="panel">
        <div className="p-5">
          {visible.length === 0 ? (
            <div className="text-cyan-300/50 text-sm">No diary entries for this filter.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-cyan-400/70 text-xs text-left">
                  <th className="pb-2 font-normal">Date</th>
                  <th className="pb-2 font-normal">Project</th>
                  <th className="pb-2 font-normal">Phase</th>
                  <th className="pb-2 font-normal">Time</th>
                  <th className="pb-2 font-normal">Location</th>
                  <th className="pb-2 font-normal">Description</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((d) => (
                  <tr key={d.id} className="hr align-top">
                    <td className="py-2.5 font-mono text-xs whitespace-nowrap">{d.entry_date}</td>
                    <td className="py-2.5 font-mono text-xs whitespace-nowrap">{d.project_code}</td>
                    <td className="py-2.5 font-mono text-xs whitespace-nowrap">LP{d.phase_number} — {d.phase_name}</td>
                    <td className="py-2.5 font-mono text-xs whitespace-nowrap">{d.time_from}–{d.time_to}</td>
                    <td className="py-2.5 whitespace-nowrap">{d.location}</td>
                    <td className="py-2.5 text-cyan-300/70">
                      {d.description || "—"}
                      {d.file_url && (
                        <a href={`${api.defaults.baseURL.replace("/api", "")}${d.file_url}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline ml-2 text-xs">
                          file
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
