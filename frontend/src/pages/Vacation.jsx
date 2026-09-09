import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

export default function Vacation() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ start_date: "", end_date: "", reason: "" });
  const [error, setError] = useState("");

  function load() {
    const endpoint = user.role === "manager" ? "/vacation" : "/vacation/mine";
    api.get(endpoint).then((r) => setRequests(r.data));
  }

  useEffect(load, []);

  async function submitRequest(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/vacation", form);
      setForm({ start_date: "", end_date: "", reason: "" });
      load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to submit request");
    }
  }

  async function decide(id, decision) {
    let counter_start, counter_end;
    if (decision === "countered") {
      counter_start = prompt("Counter-offer start date (YYYY-MM-DD)");
      counter_end = prompt("Counter-offer end date (YYYY-MM-DD)");
      if (!counter_start || !counter_end) return;
    }
    await api.patch(`/vacation/${id}/decide`, { decision, counter_start, counter_end });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg text-cyan-400 font-medium">Vacation</h1>

      {user.role === "employee" && (
        <form onSubmit={submitRequest} className="panel p-5 space-y-4 max-w-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start date</label>
              <input className="input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <div>
              <label className="label">End date</label>
              <input className="input" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Reason (optional)</label>
            <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          {error && <div className="text-rust-500 text-sm">{error}</div>}
          <button className="btn-primary" type="submit">Submit request</button>
        </form>
      )}

      <div className="panel">
        <div className="panel-header">{user.role === "manager" ? "All requests" : "My requests"}</div>
        <div className="p-4">
          {requests.length === 0 ? (
            <div className="text-cyan-300/50 text-sm">No requests.</div>
          ) : (
            <ul className="space-y-3">
              {requests.map((r) => (
                <li key={r.id} className="border-b border-navy-700 pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      {user.role === "manager" && <div className="text-sm font-semibold">{r.employee_name}</div>}
                      <div className="text-sm">{r.start_date} → {r.end_date}</div>
                      {r.reason && <div className="text-xs text-cyan-300/50">{r.reason}</div>}
                      {r.status === "countered" && (
                        <div className="text-xs text-yellow-300/80 mt-1">Counter-offer: {r.counter_start} → {r.counter_end}</div>
                      )}
                    </div>
                    <span className={`badge ${statusColor(r.status)}`}>{r.status}</span>
                  </div>
                  {user.role === "manager" && r.status === "pending" && (
                    <div className="flex gap-2 mt-2">
                      <button className="btn text-xs" onClick={() => decide(r.id, "accepted")}>Accept</button>
                      <button className="btn-danger text-xs" onClick={() => decide(r.id, "denied")}>Deny</button>
                      <button className="btn text-xs" onClick={() => decide(r.id, "countered")}>Counter-offer</button>
                    </div>
                  )}
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
    case "accepted": return "border-green-400/40 text-green-300";
    case "denied": return "border-rust-500/40 text-rust-500";
    case "countered": return "border-yellow-400/40 text-yellow-300";
    default: return "border-cyan-400/40 text-cyan-300";
  }
}
