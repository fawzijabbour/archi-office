const express = require("express");
const { pool } = require("../db");
const { requireAuth, requireManager } = require("../middleware/auth");

const router = express.Router();

const VALID_EVENTS = ["check_in", "pause_start", "pause_end", "check_out"];

function nextExpectedEvent(todaysEvents) {
  const last = todaysEvents[todaysEvents.length - 1];
  if (!last) return "check_in";
  if (last.event_type === "check_in") return ["pause_start", "check_out"];
  if (last.event_type === "pause_start") return "pause_end";
  if (last.event_type === "pause_end") return ["pause_start", "check_out"];
  if (last.event_type === "check_out") return null; // day finished
  return "check_in";
}

router.post("/scan", async (req, res) => {
  const { qr_token, event_type } = req.body;
  if (!qr_token || !VALID_EVENTS.includes(event_type)) {
    return res.status(400).json({ error: "qr_token and a valid event_type are required" });
  }

  try {
    const userResult = await pool.query(
      "SELECT id, full_name FROM users WHERE qr_token = $1 AND is_active = TRUE",
      [qr_token]
    );
    if (!userResult.rows.length) return res.status(404).json({ error: "Unknown or inactive QR code" });
    const employee = userResult.rows[0];

    const todayResult = await pool.query(
      `SELECT event_type, event_time FROM attendance_logs
       WHERE employee_id = $1 AND work_date = CURRENT_DATE
       ORDER BY event_time ASC`,
      [employee.id]
    );

    const expected = nextExpectedEvent(todayResult.rows);
    const allowed = Array.isArray(expected) ? expected.includes(event_type) : expected === event_type;

    if (!allowed) {
      return res.status(409).json({
        error: `Unexpected event. Expected: ${Array.isArray(expected) ? expected.join(" or ") : expected || "day already ended"}`,
      });
    }

    const insertResult = await pool.query(
      `INSERT INTO attendance_logs (employee_id, event_type) VALUES ($1, $2)
       RETURNING id, event_type, event_time, work_date`,
      [employee.id, event_type]
    );

    res.status(201).json({ employee: employee.full_name, log: insertResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record attendance event" });
  }
});

router.get("/today", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT event_type, event_time FROM attendance_logs
     WHERE employee_id = $1 AND work_date = CURRENT_DATE
     ORDER BY event_time ASC`,
    [req.user.id]
  );
  res.json(result.rows);
});

router.get("/summary", requireAuth, requireManager, async (req, res) => {
  const { from, to } = req.query;
  const fromDate = from || new Date().toISOString().slice(0, 10);
  const toDate = to || fromDate;

  const result = await pool.query(
    `SELECT u.id AS employee_id, u.full_name, a.work_date, a.event_type, a.event_time
     FROM attendance_logs a
     JOIN users u ON u.id = a.employee_id
     WHERE a.work_date BETWEEN $1 AND $2
     ORDER BY u.full_name, a.work_date, a.event_time`,
    [fromDate, toDate]
  );
  res.json(result.rows);
});

module.exports = router;
