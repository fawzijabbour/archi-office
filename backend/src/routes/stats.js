const express = require("express");
const { pool } = require("../db");
const { requireAuth, requireManager } = require("../middleware/auth");

const router = express.Router();

const TREND_DAYS = 14;

function round1(n) {
  return Math.round(n * 10) / 10;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function lastNDayKeys(n) {
  const keys = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keys.push(dateKey(d));
  }
  return keys;
}

async function diaryStats(employeeId) {
  const params = [];
  let where = "";
  if (employeeId) {
    where = "WHERE d.employee_id = $1";
    params.push(employeeId);
  }
  const result = await pool.query(
    `SELECT d.entry_date, d.time_from, d.time_to, d.project_id, p.name AS project_name, p.code AS project_code,
            ph.number AS phase_number, ph.name_en AS phase_name
     FROM diary_entries d
     JOIN projects p ON p.id = d.project_id
     JOIN project_phases ph ON ph.id = d.phase_id
     ${where}`,
    params
  );

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay()); // Sunday start
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let hoursToday = 0;
  let hoursWeek = 0;
  let hoursMonth = 0;
  const byProject = {};
  const byPhase = {};
  const trendKeys = lastNDayKeys(TREND_DAYS);
  const dailyHours = Object.fromEntries(trendKeys.map((k) => [k, 0]));

  for (const row of result.rows) {
    const dateStr = row.entry_date instanceof Date ? row.entry_date.toISOString().slice(0, 10) : row.entry_date;
    const entryDate = new Date(`${dateStr}T00:00:00`);
    const [fh, fm] = row.time_from.split(":").map(Number);
    const [th, tm] = row.time_to.split(":").map(Number);
    const hours = (th * 60 + tm - (fh * 60 + fm)) / 60;

    if (entryDate >= startOfDay) hoursToday += hours;
    if (entryDate >= startOfWeek) hoursWeek += hours;
    if (entryDate >= startOfMonth) hoursMonth += hours;

    const pKey = row.project_id;
    if (!byProject[pKey]) {
      byProject[pKey] = { project_id: pKey, project_name: row.project_name, project_code: row.project_code, hours: 0 };
    }
    byProject[pKey].hours += hours;

    const phKey = row.phase_number;
    if (!byPhase[phKey]) {
      byPhase[phKey] = { phase_number: row.phase_number, phase_name: row.phase_name, hours: 0 };
    }
    byPhase[phKey].hours += hours;

    if (dailyHours[dateStr] !== undefined) dailyHours[dateStr] += hours;
  }

  return {
    hours_today: round1(hoursToday),
    hours_week: round1(hoursWeek),
    hours_month: round1(hoursMonth),
    by_project: Object.values(byProject)
      .map((p) => ({ ...p, hours: round1(p.hours) }))
      .sort((a, b) => b.hours - a.hours),
    by_phase: Object.values(byPhase)
      .map((p) => ({ ...p, hours: round1(p.hours) }))
      .sort((a, b) => a.phase_number - b.phase_number),
    daily: trendKeys.map((k) => ({ date: k, hours: round1(dailyHours[k]) })),
  };
}

// Pairs pause_start -> pause_end events chronologically to get total paused time.
async function pauseStats(employeeId) {
  const result = await pool.query(
    `SELECT event_type, event_time FROM attendance_logs
     WHERE employee_id = $1 AND event_type IN ('pause_start','pause_end')
     ORDER BY event_time ASC`,
    [employeeId]
  );

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let pauseToday = 0;
  let pauseWeek = 0;
  let pauseMonth = 0;
  let openStart = null;
  const trendKeys = lastNDayKeys(TREND_DAYS);
  const dailyPause = Object.fromEntries(trendKeys.map((k) => [k, 0]));

  for (const row of result.rows) {
    if (row.event_type === "pause_start") {
      openStart = new Date(row.event_time);
    } else if (row.event_type === "pause_end" && openStart) {
      const end = new Date(row.event_time);
      const hours = (end - openStart) / 1000 / 60 / 60;
      if (openStart >= startOfDay) pauseToday += hours;
      if (openStart >= startOfWeek) pauseWeek += hours;
      if (openStart >= startOfMonth) pauseMonth += hours;
      const key = dateKey(openStart);
      if (dailyPause[key] !== undefined) dailyPause[key] += hours;
      openStart = null;
    }
  }

  return {
    pause_today: round1(pauseToday),
    pause_week: round1(pauseWeek),
    pause_month: round1(pauseMonth),
    daily_pause: trendKeys.map((k) => ({ date: k, hours: round1(dailyPause[k]) })),
  };
}

router.get("/employees", requireAuth, requireManager, async (req, res) => {
  const employees = await pool.query(
    "SELECT id, full_name, vacation_days_total, vacation_days_used FROM users WHERE role = 'employee' ORDER BY full_name"
  );

  const stats = await Promise.all(
    employees.rows.map(async (emp) => {
      const diary = await diaryStats(emp.id);
      const pause = await pauseStats(emp.id);
      return {
        id: emp.id,
        full_name: emp.full_name,
        vacation_days_total: emp.vacation_days_total,
        vacation_days_used: emp.vacation_days_used,
        hours_today: diary.hours_today,
        hours_week: diary.hours_week,
        hours_month: diary.hours_month,
        pause_today: pause.pause_today,
        pause_week: pause.pause_week,
        pause_month: pause.pause_month,
      };
    })
  );

  res.json(stats);
});

router.get("/employees/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  if (req.user.role !== "manager" && req.user.id !== id) {
    return res.status(403).json({ error: "Not allowed" });
  }
  const emp = await pool.query(
    "SELECT id, full_name, vacation_days_total, vacation_days_used FROM users WHERE id = $1",
    [id]
  );
  if (!emp.rows.length) return res.status(404).json({ error: "Employee not found" });

  const diary = await diaryStats(id);
  const pause = await pauseStats(id);

  const dailyByDate = {};
  for (const d of diary.daily) dailyByDate[d.date] = { date: d.date, hours: d.hours, pause: 0 };
  for (const p of pause.daily_pause) {
    if (!dailyByDate[p.date]) dailyByDate[p.date] = { date: p.date, hours: 0, pause: 0 };
    dailyByDate[p.date].pause = p.hours;
  }

  res.json({
    ...emp.rows[0],
    hours_today: diary.hours_today,
    hours_week: diary.hours_week,
    hours_month: diary.hours_month,
    pause_today: pause.pause_today,
    pause_week: pause.pause_week,
    pause_month: pause.pause_month,
    by_project: diary.by_project,
    by_phase: diary.by_phase,
    daily: Object.values(dailyByDate).sort((a, b) => a.date.localeCompare(b.date)),
  });
});

router.get("/overview", requireAuth, requireManager, async (req, res) => {
  const diary = await diaryStats(null);

  const employeeCount = await pool.query("SELECT COUNT(*)::int AS n FROM users WHERE role = 'employee'");
  const activeProjects = await pool.query("SELECT COUNT(*)::int AS n FROM projects WHERE status = 'active'");

  res.json({
    employee_count: employeeCount.rows[0].n,
    active_projects: activeProjects.rows[0].n,
    hours_today: diary.hours_today,
    hours_week: diary.hours_week,
    hours_month: diary.hours_month,
    by_project: diary.by_project.slice(0, 8),
    by_phase: diary.by_phase,
    daily: diary.daily,
  });
});

module.exports = router;
