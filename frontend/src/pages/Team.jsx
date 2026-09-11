import { useEffect, useState } from "react";
import api from "../api/client";

export default function Team() {
  const [employees, setEmployees] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ full_name: "", email: "", password: "" });
  const [groupForm, setGroupForm] = useState({ name: "", member_ids: [] });
  const [error, setError] = useState("");
  const [qrEmployee, setQrEmployee] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [journalEmployee, setJournalEmployee] = useState(null);
  const [journalEntries, setJournalEntries] = useState([]);

  function load() {
    api.get("/users").then((r) => setEmployees(r.data));
    api.get("/tasks/groups").then((r) => setGroups(r.data));
  }

  useEffect(load, []);

  useEffect(() => {
    if (!qrEmployee) {
      setQrImageUrl(null);
      return;
    }
    let objectUrl;
    api
      .get(`/users/${qrEmployee.id}/qrcode`, { responseType: "blob" })
      .then((r) => {
        objectUrl = URL.createObjectURL(r.data);
        setQrImageUrl(objectUrl);
      })
      .catch(() => setError("Failed to load QR code"));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [qrEmployee]);

  useEffect(() => {
    if (!journalEmployee) {
      setJournalEntries([]);
      return;
    }
    api.get(`/diary/employee/${journalEmployee.id}`).then((r) => setJournalEntries(r.data));
  }, [journalEmployee]);

  async function registerEmployee(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/register-employee", employeeForm);
      setEmployeeForm({ full_name: "", email: "", password: "" });
      setShowEmployeeForm(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to register employee");
    }
  }

  async function createGroup(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/tasks/groups", groupForm);
      setGroupForm({ name: "", member_ids: [] });
      setShowGroupForm(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create group");
    }
  }

  function toggleMember(id) {
    setGroupForm((f) => ({
      ...f,
      member_ids: f.member_ids.includes(id) ? f.member_ids.filter((m) => m !== id) : [...f.member_ids, id],
    }));
  }

  async function toggleActive(emp) {
    await api.patch(`/users/${emp.id}`, { is_active: !emp.is_active });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg text-cyan-400 font-medium">Team</h1>

      <div className="panel">
        <div className="panel-header">
          <span>Employees</span>
          <button className="btn text-xs" onClick={() => setShowEmployeeForm((s) => !s)}>
            {showEmployeeForm ? "Cancel" : "+ Register employee"}
          </button>
        </div>
        <div className="p-4">
          {showEmployeeForm && (
            <form onSubmit={registerEmployee} className="mb-5 space-y-3 max-w-md border border-navy-600/40 rounded-md p-4">
              <div>
                <label className="label">Full name</label>
                <input className="input" value={employeeForm.full_name} onChange={(e) => setEmployeeForm({ ...employeeForm, full_name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Temporary password</label>
                <input className="input" type="text" value={employeeForm.password} onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })} required />
              </div>
              {error && <div className="text-rust-500 text-sm">{error}</div>}
              <button className="btn-primary text-sm" type="submit">Create account</button>
            </form>
          )}

          {employees.length === 0 ? (
            <div className="text-cyan-300/50 text-sm">No employees yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-cyan-400/70 text-xs text-left">
                  <th className="pb-2 font-normal">Name</th>
                  <th className="pb-2 font-normal">Email</th>
                  <th className="pb-2 font-normal">Vacation</th>
                  <th className="pb-2 font-normal">Status</th>
                  <th className="pb-2 font-normal">QR</th>
                  <th className="pb-2 font-normal">Journal</th>
                  <th className="pb-2 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-t border-navy-600/30">
                    <td className="py-2">{e.full_name}</td>
                    <td className="py-2 text-cyan-300/70 font-mono text-xs">{e.email}</td>
                    <td className="py-2 font-mono text-xs">{e.vacation_days_used}/{e.vacation_days_total}</td>
                    <td className="py-2">
                      <span className={`badge ${e.is_active ? "border-cyan-400/40 text-cyan-400" : "border-rust-500/40 text-rust-500"}`}>
                        {e.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="py-2">
                      <button className="btn text-xs py-1" onClick={() => setQrEmployee(e)}>view</button>
                    </td>
                    <td className="py-2">
                      <button className="btn text-xs py-1" onClick={() => setJournalEmployee(e)}>view</button>
                    </td>
                    <td className="py-2">
                      <button className="text-xs text-cyan-300/60 hover:text-cyan-300 underline" onClick={() => toggleActive(e)}>
                        {e.is_active ? "deactivate" : "activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {qrEmployee && (
        <div className="panel p-5 max-w-xs">
          <div className="label mb-2">{qrEmployee.full_name} — attendance QR</div>
          {qrImageUrl ? (
            <img src={qrImageUrl} alt="QR code" className="border border-navy-600/40 bg-white p-2 rounded-md" />
          ) : (
            <div className="text-cyan-300/50 text-sm">Loading...</div>
          )}
          <button className="btn text-xs mt-3" onClick={() => setQrEmployee(null)}>Close</button>
        </div>
      )}

      {journalEmployee && (
        <div className="panel">
          <div className="panel-header">
            <span>{journalEmployee.full_name} — journal</span>
            <button className="btn text-xs" onClick={() => setJournalEmployee(null)}>Close</button>
          </div>
          <div className="px-5 pb-5">
            {journalEntries.length === 0 ? (
              <div className="text-cyan-300/50 text-sm">No journal entries yet.</div>
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
                  {journalEntries.map((d) => (
                    <tr key={d.id} className="hr align-top">
                      <td className="py-2.5 font-mono text-xs whitespace-nowrap">{d.entry_date}</td>
                      <td className="py-2.5 font-mono text-xs whitespace-nowrap">{d.project_code}</td>
                      <td className="py-2.5 font-mono text-xs whitespace-nowrap">LP{d.phase_number} — {d.phase_name}</td>
                      <td className="py-2.5 font-mono text-xs whitespace-nowrap">{d.time_from}–{d.time_to}</td>
                      <td className="py-2.5 whitespace-nowrap">{d.location}</td>
                      <td className="py-2.5 text-cyan-300/70">{d.description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <span>Groups</span>
          <button className="btn text-xs" onClick={() => setShowGroupForm((s) => !s)}>
            {showGroupForm ? "Cancel" : "+ New group"}
          </button>
        </div>
        <div className="p-4">
          {showGroupForm && (
            <form onSubmit={createGroup} className="mb-5 space-y-3 max-w-md border border-navy-600/40 rounded-md p-4">
              <div>
                <label className="label">Group name</label>
                <input className="input" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Members</label>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-navy-600/40 rounded-md p-2">
                  {employees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={groupForm.member_ids.includes(e.id)} onChange={() => toggleMember(e.id)} />
                      {e.full_name}
                    </label>
                  ))}
                </div>
              </div>
              <button className="btn-primary text-sm" type="submit">Create group</button>
            </form>
          )}

          {groups.length === 0 ? (
            <div className="text-cyan-300/50 text-sm">No groups yet.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {groups.map((g) => (
                <li key={g.id} className="border-t border-navy-600/30 pt-2">
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-cyan-300/50">
                    {g.members.map((m) => m.full_name).join(", ") || "No members"}
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
