import { useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

export default function Account() {
  const { user } = useAuth();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (form.new_password !== form.confirm_password) {
      setError("New password and confirmation don't match");
      return;
    }
    if (form.new_password.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    setBusy(true);
    try {
      await api.patch("/auth/change-password", {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccess(true);
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-lg text-cyan-400 font-medium">Account</h1>

      <div className="panel p-5">
        <div className="text-sm text-cyan-300/70 space-y-1">
          <div><span className="text-cyan-300/50">Name</span> — {user?.full_name}</div>
          <div><span className="text-cyan-300/50">Email</span> — {user?.email}</div>
          <div><span className="text-cyan-300/50">Role</span> — {user?.role}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">Change password</div>
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          <div>
            <label className="label">Current password</label>
            <input
              className="input"
              type="password"
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              className="input"
              type="password"
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              className="input"
              type="password"
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              required
              minLength={8}
            />
          </div>
          {error && <div className="text-rust-500 text-sm">{error}</div>}
          {success && <div className="text-sm text-green-400">Password updated.</div>}
          <button className="btn-primary" disabled={busy} type="submit">
            {busy ? "Saving..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
