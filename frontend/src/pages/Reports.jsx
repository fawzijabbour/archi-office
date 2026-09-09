import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import api from "../api/client";

const INK = "#2B2B28";
const BLUEPRINT = "#1F3A5F";
const BLUEPRINT_SOFT = "#5C7FA8";
const RUST = "#B5502F";
const GRID = "#DCD4BF";
const PROJECT_COLORS = ["#1F3A5F", "#5C7FA8", "#8A8371", "#B5502F", "#C46A46", "#3D5A80", "#7C93A8", "#A68A6B"];

function shortDate(d) {
  return new Date(`${d}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });
}

const tooltipStyle = {
  background: "#FBF9F4",
  border: "1px solid rgba(138,131,113,0.4)",
  borderRadius: 0,
  fontSize: 12,
  color: INK,
};

export default function Reports() {
  const [overview, setOverview] = useState(null);
  const [stats, setStats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.get("/stats/overview").then((r) => setOverview(r.data));
    api.get("/stats/employees").then((r) => setStats(r.data));
  }, []);

  function select(emp) {
    if (selected === emp.id) {
      setSelected(null);
      setDetail(null);
      return;
    }
    setSelected(emp.id);
    setDetail(null);
    api.get(`/stats/employees/${emp.id}`).then((r) => setDetail(r.data));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg text-cyan-400 font-medium">Reports</h1>

      {overview && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Employees" value={overview.employee_count} />
            <StatCard label="Active projects" value={overview.active_projects} />
            <StatCard label="Hours today" value={`${overview.hours_today}h`} />
            <StatCard label="Hours this week" value={`${overview.hours_week}h`} />
          </div>

          <div className="panel">
            <div className="panel-header">Hours logged, last 14 days — all employees</div>
            <div className="px-5 pb-5" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overview.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: INK }} axisLine={{ stroke: GRID }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: INK }} axisLine={{ stroke: GRID }} tickLine={false} width={32} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={shortDate} formatter={(v) => [`${v}h`, "Hours"]} />
                  <Line type="monotone" dataKey="hours" stroke={BLUEPRINT} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="panel">
              <div className="panel-header">Hours by project (all time)</div>
              <div className="px-5 pb-5" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.by_project} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: INK }} axisLine={{ stroke: GRID }} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="project_code"
                      tick={{ fontSize: 11, fill: INK }}
                      axisLine={{ stroke: GRID }}
                      tickLine={false}
                      width={64}
                    />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, n, p) => [`${v}h`, p.payload.project_name]} />
                    <Bar dataKey="hours" radius={0}>
                      {overview.by_project.map((_, i) => <Cell key={i} fill={PROJECT_COLORS[i % PROJECT_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">Hours by phase (all time)</div>
              <div className="px-5 pb-5" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.by_phase} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="phase_number" tickFormatter={(n) => `LP${n}`} tick={{ fontSize: 11, fill: INK }} axisLine={{ stroke: GRID }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: INK }} axisLine={{ stroke: GRID }} tickLine={false} width={32} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(n) => `LP${n}`} formatter={(v, n, p) => [`${v}h`, p.payload.phase_name]} />
                    <Bar dataKey="hours" fill={BLUEPRINT_SOFT} radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="panel">
        <div className="panel-header">By employee</div>
        <div className="px-5 pb-5">
          {stats.length === 0 ? (
            <div className="text-cyan-300/50 text-sm">No employees yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-cyan-400/70 text-xs text-left">
                  <th className="pb-2 font-normal">Employee</th>
                  <th className="pb-2 font-normal">Today</th>
                  <th className="pb-2 font-normal">This week</th>
                  <th className="pb-2 font-normal">This month</th>
                  <th className="pb-2 font-normal">Pause (month)</th>
                  <th className="pb-2 font-normal">Vacation</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((e) => (
                  <EmployeeRow key={e.id} emp={e} isOpen={selected === e.id} detail={selected === e.id ? detail : null} onClick={() => select(e)} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeRow({ emp, isOpen, detail, onClick }) {
  return (
    <>
      <tr className="hr cursor-pointer hover:bg-navy-800" onClick={onClick}>
        <td className="py-2.5">{emp.full_name}</td>
        <td className="py-2.5 font-mono">{emp.hours_today}h</td>
        <td className="py-2.5 font-mono">{emp.hours_week}h</td>
        <td className="py-2.5 font-mono">{emp.hours_month}h</td>
        <td className="py-2.5 font-mono">{emp.pause_month}h</td>
        <td className="py-2.5 font-mono">{emp.vacation_days_used}/{emp.vacation_days_total}</td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={6} className="bg-navy-950/40 px-2 py-5">
            {!detail ? (
              <div className="text-cyan-300/50 text-sm px-2">Loading...</div>
            ) : (
              <div className="grid grid-cols-2 gap-6 px-2">
                <div>
                  <div className="text-xs text-cyan-400/70 mb-2">Hours worked vs. paused, last 14 days</div>
                  <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={detail.daily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid stroke={GRID} vertical={false} />
                        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: INK }} axisLine={{ stroke: GRID }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: INK }} axisLine={{ stroke: GRID }} tickLine={false} width={28} />
                        <Tooltip contentStyle={tooltipStyle} labelFormatter={shortDate} formatter={(v, n) => [`${v}h`, n === "hours" ? "Worked" : "Paused"]} />
                        <Bar dataKey="hours" stackId="a" fill={BLUEPRINT} radius={0} />
                        <Bar dataKey="pause" stackId="a" fill={RUST} radius={0} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-cyan-300/60">
                    <span><span className="inline-block w-2.5 h-2.5 mr-1 align-middle" style={{ background: BLUEPRINT }} />Worked</span>
                    <span><span className="inline-block w-2.5 h-2.5 mr-1 align-middle" style={{ background: RUST }} />Paused</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-cyan-400/70 mb-2">Hours by project (all time)</div>
                  {detail.by_project.length === 0 ? (
                    <div className="text-cyan-300/50 text-sm">No journal entries yet.</div>
                  ) : (
                    <div style={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={detail.by_project}
                            dataKey="hours"
                            nameKey="project_code"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={1}
                          >
                            {detail.by_project.map((_, i) => <Cell key={i} fill={PROJECT_COLORS[i % PROJECT_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(v, n, p) => [`${v}h`, p.payload.project_name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {detail.by_project.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {detail.by_project.map((p, i) => (
                        <li key={p.project_id} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-cyan-300/70">
                            <span className="inline-block w-2.5 h-2.5" style={{ background: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
                            {p.project_code} — {p.project_name}
                          </span>
                          <span className="font-mono">{p.hours}h</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="panel p-4">
      <div className="text-xs text-cyan-400/70">{label}</div>
      <div className="text-3xl font-semibold text-cyan-400 mt-1 font-mono">{value}</div>
    </div>
  );
}
