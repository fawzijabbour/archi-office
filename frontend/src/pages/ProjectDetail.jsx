import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import api, { API_URL } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { FilePreviewLarge, FileRow } from "../components/FilePreview.jsx";

const BLUEPRINT_SOFT = "#5C7FA8";
const GRID = "#DCD4BF";
const INK = "#2B2B28";
const tooltipStyle = { background: "#FBF9F4", border: "1px solid rgba(138,131,113,0.4)", borderRadius: 0, fontSize: 12, color: INK };

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [updateMsg, setUpdateMsg] = useState("");
  const [assignId, setAssignId] = useState("");
  const [permId, setPermId] = useState("");
  const [permLevel, setPermLevel] = useState("view");
  const [editingClient, setEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState({ client_name: "", client_contact: "", client_phone: "", client_email: "", client_notes: "" });
  const [error, setError] = useState("");

  function load() {
    api.get(`/projects/${id}`).then((r) => {
      setProject(r.data);
      setClientForm({
        client_name: r.data.client_name || "",
        client_contact: r.data.client_contact || "",
        client_phone: r.data.client_phone || "",
        client_email: r.data.client_email || "",
        client_notes: r.data.client_notes || "",
      });
    }).catch((e) => setError(e?.response?.data?.error || "Failed to load"));
    if (user.role === "manager") {
      api.get(`/projects/${id}/stats`).then((r) => setStats(r.data));
      api.get("/users").then((r) => setEmployees(r.data));
    }
  }

  useEffect(load, [id]);

  async function postUpdate(e) {
    e.preventDefault();
    if (!updateMsg.trim()) return;
    await api.post(`/projects/${id}/updates`, { message: updateMsg });
    setUpdateMsg("");
    load();
  }

  async function assignEmployee(e) {
    e.preventDefault();
    if (!assignId) return;
    await api.post(`/projects/${id}/assign`, { employee_id: assignId });
    setAssignId("");
    load();
  }

  async function grantPermission(e) {
    e.preventDefault();
    if (!permId) return;
    await api.post(`/projects/${id}/permissions`, { employee_id: permId, access_level: permLevel });
    setPermId("");
    load();
  }

  async function uploadFile(e, asMainPlan) {
    const file = e.target.files[0];
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    if (asMainPlan) data.append("as_main_plan", "true");
    await api.post(`/projects/${id}/files`, data, { headers: { "Content-Type": "multipart/form-data" } });
    load();
  }

  async function saveClient(e) {
    e.preventDefault();
    await api.patch(`/projects/${id}`, clientForm);
    setEditingClient(false);
    load();
  }

  if (error) return <div className="panel p-5 text-rust-500">{error}</div>;
  if (!project) return <div className="text-cyan-300/50">Loading...</div>;

  const fileUrl = (path) => `${API_URL.replace("/api", "")}${path}`;
  const formatMeeting = (m) => m ? new Date(m.start_time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className="space-y-6">
      <div className="panel p-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl text-cyan-400 font-medium">{project.name}</h1>
            <div className="text-xs text-cyan-300/50 font-mono mt-0.5">
              {project.code} {project.client_name && `· ${project.client_name}`}
            </div>
          </div>
          <span className="badge border-cyan-400/40 text-cyan-400">{project.status}</span>
        </div>
        {project.phase_name && (
          <div className="text-sm text-cyan-300/70 mt-3 font-mono">
            LP{project.phase_number} — {project.phase_name}
          </div>
        )}
        {project.description && <p className="text-sm text-cyan-300/70 mt-3 max-w-2xl">{project.description}</p>}
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Customer</span>
          {user.role === "manager" && (
            <button className="text-xs text-cyan-400 hover:underline" onClick={() => setEditingClient((v) => !v)}>
              {editingClient ? "Cancel" : "Edit"}
            </button>
          )}
        </div>
        <div className="px-5 pb-5">
          {editingClient ? (
            <form onSubmit={saveClient} className="space-y-3 max-w-md">
              <div>
                <label className="label">Client name</label>
                <input className="input" value={clientForm.client_name} onChange={(e) => setClientForm({ ...clientForm, client_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Contact person</label>
                <input className="input" value={clientForm.client_contact} onChange={(e) => setClientForm({ ...clientForm, client_contact: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={clientForm.client_phone} onChange={(e) => setClientForm({ ...clientForm, client_phone: e.target.value })} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" value={clientForm.client_email} onChange={(e) => setClientForm({ ...clientForm, client_email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={clientForm.client_notes} onChange={(e) => setClientForm({ ...clientForm, client_notes: e.target.value })} />
              </div>
              <button className="btn-primary text-sm" type="submit">Save</button>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <Field label="Contact person" value={project.client_contact} />
              <Field label="Phone" value={project.client_phone} />
              <Field label="Email" value={project.client_email} />
              <Field label="Last meeting" value={formatMeeting(project.last_meeting) || "—"} />
              <Field label="Next meeting" value={formatMeeting(project.next_meeting) || "—"} />
              {project.client_notes && (
                <div className="col-span-2">
                  <div className="label mb-1">Notes</div>
                  <div className="text-cyan-300/80">{project.client_notes}</div>
                </div>
              )}
              <div className="col-span-2 pt-1">
                <Link to={`/calendar?project_id=${id}`} className="btn text-xs">Schedule a meeting</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="panel p-5">
        <div className="label mb-2">Main plan</div>
        {project.main_plan_file ? (
          <FilePreviewLarge url={fileUrl(project.main_plan_file)} name={project.main_plan_file} label="Main plan" />
        ) : (
          <div className="text-cyan-300/40 text-sm mb-2">No plan uploaded yet.</div>
        )}
        {user.role === "manager" && (
          <div className="mt-3">
            <label className="text-xs text-cyan-400 underline cursor-pointer">
              {project.main_plan_file ? "Replace plan" : "Upload plan"}
              <input type="file" className="hidden" onChange={(e) => uploadFile(e, true)} />
            </label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="panel">
          <div className="panel-header">
            <span>Files</span>
            {user.role === "manager" && (
              <label className="text-xs text-cyan-400 underline cursor-pointer">
                + Upload
                <input type="file" className="hidden" onChange={(e) => uploadFile(e, false)} />
              </label>
            )}
          </div>
          <div className="px-5 pb-5">
            {project.files.length === 0 ? (
              <div className="text-cyan-300/50 text-sm">No files uploaded.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {project.files.map((f) => (
                  <li key={f.id}>
                    <FileRow url={fileUrl(f.file_url)} name={f.file_name} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">Latest updates</div>
          <div className="px-5 pb-5 space-y-3">
            {user.role === "manager" && (
              <form onSubmit={postUpdate} className="flex gap-2">
                <input className="input" value={updateMsg} onChange={(e) => setUpdateMsg(e.target.value)} placeholder="Post an update..." />
                <button className="btn-primary text-xs" type="submit">Post</button>
              </form>
            )}
            {project.updates.length === 0 ? (
              <div className="text-cyan-300/50 text-sm">No updates yet.</div>
            ) : (
              <ul>
                {project.updates.map((u) => (
                  <li key={u.id} className="hr py-2 first:border-t-0 first:pt-0 text-sm">
                    <div>{u.message}</div>
                    <div className="text-xs text-cyan-300/50 font-mono mt-0.5">{u.author_name} · {new Date(u.created_at).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {user.role === "manager" && (
        <div className="panel">
          <div className="panel-header">Team access</div>
          <div className="px-5 pb-5 grid grid-cols-2 gap-8">
            <div>
              <div className="text-xs text-cyan-300/50 mb-2">
                Assigned employees can log journal entries against this project.
              </div>
              <ul className="text-sm space-y-1 mb-3">
                {project.assignees.length === 0 ? (
                  <div className="text-cyan-300/50">No one assigned yet.</div>
                ) : (
                  project.assignees.map((a) => <li key={a.id}>{a.full_name}</li>)
                )}
              </ul>
              <form onSubmit={assignEmployee} className="flex gap-2">
                <select className="input" value={assignId} onChange={(e) => setAssignId(e.target.value)}>
                  <option value="">Select employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
                <button className="btn text-xs" type="submit">Assign</button>
              </form>
            </div>

            <div>
              <div className="text-xs text-cyan-300/50 mb-2">
                Page access lets employees view this project's plan, files, and updates.
              </div>
              <form onSubmit={grantPermission} className="flex gap-2 flex-wrap">
                <select className="input" value={permId} onChange={(e) => setPermId(e.target.value)}>
                  <option value="">Select employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
                <select className="input w-28" value={permLevel} onChange={(e) => setPermLevel(e.target.value)}>
                  <option value="view">view</option>
                  <option value="edit">edit</option>
                </select>
                <button className="btn text-xs" type="submit">Grant</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-6">
          <div className="panel">
            <div className="panel-header">Hours by phase</div>
            <div className="px-5 pb-5">
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byPhase.map((p) => ({ ...p, hours: parseFloat(p.hours) }))} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="number" tickFormatter={(n) => `LP${n}`} tick={{ fontSize: 10, fill: INK }} axisLine={{ stroke: GRID }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: INK }} axisLine={{ stroke: GRID }} tickLine={false} width={28} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(n) => `LP${n}`} formatter={(v, n, p) => [`${v.toFixed(1)}h`, p.payload.name_en]} />
                    <Bar dataKey="hours" fill={BLUEPRINT_SOFT} radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="w-full text-sm mt-3">
                <tbody>
                  {stats.byPhase.filter((p) => parseFloat(p.hours) > 0).map((p) => (
                    <tr key={p.number} className="hr">
                      <td className="py-1.5 font-mono text-xs">LP{p.number} — {p.name_en}</td>
                      <td className="py-1.5 font-mono text-xs text-right">{parseFloat(p.hours).toFixed(1)}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">Hours by employee</div>
            <div className="px-5 pb-5">
              {stats.byEmployee.length === 0 ? (
                <div className="text-cyan-300/50 text-sm">No journal entries yet.</div>
              ) : (
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.byEmployee.map((e) => ({ ...e, hours: parseFloat(e.hours) }))} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={GRID} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: INK }} axisLine={{ stroke: GRID }} tickLine={false} />
                      <YAxis type="category" dataKey="full_name" tick={{ fontSize: 10, fill: INK }} axisLine={{ stroke: GRID }} tickLine={false} width={90} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v.toFixed(1)}h`, "Hours"]} />
                      <Bar dataKey="hours" fill={BLUEPRINT_SOFT} radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <div className="text-cyan-300/85">{value || "—"}</div>
    </div>
  );
}
