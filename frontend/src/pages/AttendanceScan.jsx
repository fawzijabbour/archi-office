import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client";

// No login required here — the qr_token in the URL is itself the credential.
const EVENTS = [
  { type: "check_in", label: "Come in" },
  { type: "pause_start", label: "Start pause" },
  { type: "pause_end", label: "Resume work" },
  { type: "check_out", label: "End of day" },
];

export default function AttendanceScan() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  async function fire(event_type) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await api.post("/attendance/scan", { qr_token: token, event_type });
      setStatus({ ok: true, message: `${res.data.employee}: ${event_type.replace("_", " ")} recorded at ${new Date(res.data.log.event_time).toLocaleTimeString()}` });
    } catch (err) {
      setStatus({ ok: false, message: err?.response?.data?.error || "Failed to record event" });
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div className="panel p-6 max-w-sm">
          <div className="text-rust-500 mb-2">No QR token found in URL.</div>
          <div className="text-cyan-300/60 text-sm">Scan your personal attendance QR code to use this page.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="panel w-full max-w-sm">
        <div className="panel-header">Attendance</div>
        <div className="p-5 space-y-3">
          {EVENTS.map((e) => (
            <button key={e.type} className="btn-primary w-full" disabled={busy} onClick={() => fire(e.type)}>
              {e.label}
            </button>
          ))}
          {status && (
            <div className={`mt-3 text-sm ${status.ok ? "text-cyan-300" : "text-rust-500"}`}>{status.message}</div>
          )}
        </div>
      </div>
    </div>
  );
}
