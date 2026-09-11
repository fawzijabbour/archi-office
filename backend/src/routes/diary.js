const express = require("express");
const { pool } = require("../db");
const { requireAuth, requireManager } = require("../middleware/auth");
const { upload } = require("../upload");

const router = express.Router();

const VALID_LOCATIONS = ["office", "site", "home", "client"];

router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  const { project_id, phase_id, entry_date, time_from, time_to, location, description } = req.body;

  if (!project_id || !phase_id || !time_from || !time_to || !location) {
    return res.status(400).json({ error: "project_id, phase_id, time_from, time_to, location are required" });
  }
  if (!VALID_LOCATIONS.includes(location)) {
    return res.status(400).json({ error: `location must be one of: ${VALID_LOCATIONS.join(", ")}` });
  }

  if (req.user.role !== "manager") {
    const assigned = await pool.query(
      "SELECT 1 FROM project_assignments WHERE project_id = $1 AND employee_id = $2",
      [project_id, req.user.id]
    );
    if (!assigned.rows.length) {
      return res.status(403).json({ error: "You are not assigned to this project" });
    }
  }

  const file_url = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      `INSERT INTO diary_entries
        (employee_id, project_id, phase_id, entry_date, time_from, time_to, location, description, file_url)
       VALUES ($1,$2,$3, COALESCE($4, CURRENT_DATE), $5,$6,$7,$8,$9)
       RETURNING *`,
      [req.user.id, project_id, phase_id, entry_date || null, time_from, time_to, location, description || null, file_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create diary entry" });
  }
});

router.get("/mine", requireAuth, async (req, res) => {
  const { date } = req.query;
  const params = [req.user.id];
  let query = `
    SELECT d.*, p.code AS project_code, p.name AS project_name, ph.name_en AS phase_name, ph.number AS phase_number
    FROM diary_entries d
    JOIN projects p ON p.id = d.project_id
    JOIN project_phases ph ON ph.id = d.phase_id
    WHERE d.employee_id = $1`;
  if (date) {
    query += " AND d.entry_date = $2";
    params.push(date);
  }
  query += " ORDER BY d.entry_date DESC, d.time_from DESC";
  const result = await pool.query(query, params);
  res.json(result.rows);
});

router.get("/project/:projectId", requireAuth, async (req, res) => {
  const { projectId } = req.params;

  if (req.user.role !== "manager") {
    const perm = await pool.query(
      "SELECT 1 FROM project_permissions WHERE project_id = $1 AND employee_id = $2",
      [projectId, req.user.id]
    );
    if (!perm.rows.length) return res.status(403).json({ error: "No access to this project's diary" });
  }

  const result = await pool.query(
    `SELECT d.*, u.full_name AS employee_name, ph.name_en AS phase_name, ph.number AS phase_number
     FROM diary_entries d
     JOIN users u ON u.id = d.employee_id
     JOIN project_phases ph ON ph.id = d.phase_id
     WHERE d.project_id = $1
     ORDER BY d.entry_date DESC, d.time_from DESC`,
    [projectId]
  );
  res.json(result.rows);
});

router.get("/employee/:employeeId", requireAuth, async (req, res) => {
  const { employeeId } = req.params;
  if (req.user.role !== "manager" && req.user.id !== employeeId) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const { date, project_id } = req.query;
  const params = [employeeId];
  let query = `
    SELECT d.*, p.code AS project_code, p.name AS project_name, ph.name_en AS phase_name, ph.number AS phase_number
    FROM diary_entries d
    JOIN projects p ON p.id = d.project_id
    JOIN project_phases ph ON ph.id = d.phase_id
    WHERE d.employee_id = $1`;
  if (date) {
    params.push(date);
    query += ` AND d.entry_date = $${params.length}`;
  }
  if (project_id) {
    params.push(project_id);
    query += ` AND d.project_id = $${params.length}`;
  }
  query += " ORDER BY d.entry_date DESC, d.time_from DESC";
  const result = await pool.query(query, params);
  res.json(result.rows);
});

module.exports = router;
