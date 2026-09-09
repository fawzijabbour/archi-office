import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-cyan-400 font-semibold text-xl">ArchiOffice</div>
          <div className="text-xs text-cyan-300/50 font-mono mt-1">practice management</div>
        </div>
        <div className="panel border-t-2 border-t-cyan-400">
          <div className="panel-header">Sign in</div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <div className="text-rust-500 text-sm">{error}</div>}
            <button className="btn-primary w-full" disabled={busy} type="submit">
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
