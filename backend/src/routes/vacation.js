const express = require("express");
const { pool } = require("../db");
const { requireAuth, requireManager } = require("../middleware/auth");
const { notify } = require("../notify");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const { start_date, end_date, reason } = req.body;
  if (!start_date || !end_date) return res.status(400).json({ error: "start_date and end_date are required" });
  const result = await pool.query(
    `INSERT INTO vacation_requests (employee_id, start_date, end_date, reason)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.user.id, start_date, end_date, reason || null]
  );

  const managers = await pool.query("SELECT id FROM users WHERE role = 'manager'");
  for (const m of managers.rows) {
    await notify(m.id, `${req.user.full_name} requested vacation ${start_date} → ${end_date}.`, "/vacation");
  }

  res.status(201).json(result.rows[0]);
});

router.get("/mine", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM vacation_requests WHERE employee_id = $1 ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json(result.rows);
});

router.get("/", requireAuth, requireManager, async (req, res) => {
  const { status } = req.query;
  const params = [];
  let query = `SELECT v.*, u.full_name AS employee_name FROM vacation_requests v JOIN users u ON u.id = v.employee_id`;
  if (status) {
    query += " WHERE v.status = $1";
    params.push(status);
  }
  query += " ORDER BY v.created_at DESC";
  const result = await pool.query(query, params);
  res.json(result.rows);
});

router.patch("/:id/decide", requireAuth, requireManager, async (req, res) => {
  const { id } = req.params;
  const { decision, counter_start, counter_end, manager_note } = req.body;
  if (!["accepted", "denied", "countered"].includes(decision)) {
    return res.status(400).json({ error: "decision must be accepted, denied, or countered" });
  }
  if (decision === "countered" && (!counter_start || !counter_end)) {
    return res.status(400).json({ error: "counter_start and counter_end are required for a counter-offer" });
  }

  const result = await pool.query(
    `UPDATE vacation_requests
     SET status = $1, counter_start = $2, counter_end = $3, manager_note = $4,
         decided_by = $5, decided_at = now()
     WHERE id = $6 RETURNING *`,
    [decision, counter_start || null, counter_end || null, manager_note || null, req.user.id, id]
  );
  if (!result.rows.length) return res.status(404).json({ error: "Request not found" });

  const request = result.rows[0];

  if (decision === "accepted") {
    const days = Math.ceil(
      (new Date(request.end_date) - new Date(request.start_date)) / (1000 * 60 * 60 * 24)
    ) + 1;
    await pool.query("UPDATE users SET vacation_days_used = vacation_days_used + $1 WHERE id = $2", [
      days,
      request.employee_id,
    ]);
  }

  const decisionText = { accepted: "accepted", denied: "denied", countered: "countered with new dates" }[decision];
  await notify(
    request.employee_id,
    `Your vacation request for ${request.start_date} → ${request.end_date} was ${decisionText}.`,
    "/vacation"
  );

  res.json(request);
});

module.exports = router;
