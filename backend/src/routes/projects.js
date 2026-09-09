const express = require("express");
const { pool } = require("../db");
const { requireAuth, requireManager } = require("../middleware/auth");
const { upload } = require("../upload");
const { notify, notifyMany } = require("../notify");

const router = express.Router();

router.post("/", requireAuth, requireManager, async (req, res) => {
  const { code, name, description, client_name, client_contact, client_phone, client_email, current_phase_id } = req.body;
  if (!code || !name) return res.status(400).json({ error: "code and name are required" });
  try {
    const result = await pool.query(
      `INSERT INTO projects (code, name, description, client_name, client_contact, client_phone, client_email, current_phase_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [code, name, description || null, client_name || null, client_contact || null, client_phone || null, client_email || null, current_phase_id || 1, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Project code already exists" });
    console.error(err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  if (req.user.role === "manager") {
    const result = await pool.query(
      `SELECT p.*, ph.name_en AS phase_name, ph.number AS phase_number
       FROM projects p LEFT JOIN project_phases ph ON ph.id = p.current_phase_id
       ORDER BY p.created_at DESC`
    );
    return res.json(result.rows);
  }
  const result = await pool.query(
    `SELECT DISTINCT p.*, ph.name_en AS phase_name, ph.number AS phase_number
     FROM projects p
     LEFT JOIN project_phases ph ON ph.id = p.current_phase_id
     LEFT JOIN project_assignments pa ON pa.project_id = p.id AND pa.employee_id = $1
     LEFT JOIN project_permissions pp ON pp.project_id = p.id AND pp.employee_id = $1
     WHERE pa.employee_id IS NOT NULL OR pp.employee_id IS NOT NULL
     ORDER BY p.created_at DESC`,
    [req.user.id]
  );
  res.json(result.rows);
});

router.get("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== "manager") {
    const perm = await pool.query(
      "SELECT access_level FROM project_permissions WHERE project_id = $1 AND employee_id = $2",
      [id, req.user.id]
    );
    if (!perm.rows.length) return res.status(403).json({ error: "You do not have permission to view this project" });
  }

  const project = await pool.query(
    `SELECT p.*, ph.name_en AS phase_name, ph.number AS phase_number
     FROM projects p LEFT JOIN project_phases ph ON ph.id = p.current_phase_id
     WHERE p.id = $1`,
    [id]
  );
  if (!project.rows.length) return res.status(404).json({ error: "Project not found" });

  const files = await pool.query("SELECT * FROM project_files WHERE project_id = $1 ORDER BY uploaded_at DESC", [id]);
  const updates = await pool.query(
    `SELECT pu.*, u.full_name AS author_name FROM project_updates pu
     JOIN users u ON u.id = pu.author_id WHERE pu.project_id = $1 ORDER BY pu.created_at DESC LIMIT 20`,
    [id]
  );
  const assignees = await pool.query(
    `SELECT u.id, u.full_name FROM project_assignments pa JOIN users u ON u.id = pa.employee_id WHERE pa.project_id = $1`,
    [id]
  );
  const lastMeeting = await pool.query(
    `SELECT * FROM meetings WHERE project_id = $1 AND start_time < now() ORDER BY start_time DESC LIMIT 1`,
    [id]
  );
  const nextMeeting = await pool.query(
    `SELECT * FROM meetings WHERE project_id = $1 AND start_time >= now() ORDER BY start_time ASC LIMIT 1`,
    [id]
  );

  res.json({
    ...project.rows[0],
    files: files.rows,
    updates: updates.rows,
    assignees: assignees.rows,
    last_meeting: lastMeeting.rows[0] || null,
    next_meeting: nextMeeting.rows[0] || null,
  });
});

router.patch("/:id", requireAuth, requireManager, async (req, res) => {
  const { id } = req.params;
  const { name, description, client_name, client_contact, client_phone, client_email, client_notes, status, current_phase_id } = req.body;
  const fields = [];
  const values = [];
  let i = 1;
  const map = { name, description, client_name, client_contact, client_phone, client_email, client_notes, status, current_phase_id };
  for (const [key, val] of Object.entries(map)) {
    if (val !== undefined) {
      fields.push(`${key} = $${i++}`);
      values.push(val);
    }
  }
  if (!fields.length) return res.status(400).json({ error: "No fields to update" });
  fields.push(`updated_at = now()`);
  values.push(id);
  const result = await pool.query(`UPDATE projects SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`, values);
  if (!result.rows.length) return res.status(404).json({ error: "Project not found" });
  res.json(result.rows[0]);
});

router.post("/:id/files", requireAuth, requireManager, upload.single("file"), async (req, res) => {
  const { id } = req.params;
  const { as_main_plan } = req.body;
  if (!req.file) return res.status(400).json({ error: "file is required" });
  const file_url = `/uploads/${req.file.filename}`;

  if (as_main_plan === "true") {
    await pool.query("UPDATE projects SET main_plan_file = $1, updated_at = now() WHERE id = $2", [file_url, id]);
  }

  const result = await pool.query(
    `INSERT INTO project_files (project_id, file_url, file_name, uploaded_by)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, file_url, req.file.originalname, req.user.id]
  );
  res.status(201).json(result.rows[0]);
});

router.post("/:id/updates", requireAuth, requireManager, async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });
  const result = await pool.query(
    "INSERT INTO project_updates (project_id, author_id, message) VALUES ($1,$2,$3) RETURNING *",
    [id, req.user.id, message]
  );

  const project = await pool.query("SELECT name FROM projects WHERE id = $1", [id]);
  const recipients = await pool.query(
    `SELECT employee_id FROM project_assignments WHERE project_id = $1
     UNION
     SELECT employee_id FROM project_permissions WHERE project_id = $1`,
    [id]
  );
  await notifyMany(
    recipients.rows.map((r) => r.employee_id),
    `${project.rows[0]?.name}: ${message}`,
    `/projects/${id}`
  );

  res.status(201).json(result.rows[0]);
});

router.post("/:id/assign", requireAuth, requireManager, async (req, res) => {
  const { id } = req.params;
  const { employee_id } = req.body;
  if (!employee_id) return res.status(400).json({ error: "employee_id is required" });
  await pool.query(
    "INSERT INTO project_assignments (project_id, employee_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [id, employee_id]
  );
  const project = await pool.query("SELECT name FROM projects WHERE id = $1", [id]);
  await notify(employee_id, `You were assigned to project "${project.rows[0]?.name}".`, `/projects/${id}`);
  res.status(201).json({ ok: true });
});

router.post("/:id/permissions", requireAuth, requireManager, async (req, res) => {
  const { id } = req.params;
  const { employee_id, access_level } = req.body;
  if (!employee_id) return res.status(400).json({ error: "employee_id is required" });
  const result = await pool.query(
    `INSERT INTO project_permissions (project_id, employee_id, access_level, granted_by)
     VALUES ($1,$2,COALESCE($3,'view'),$4)
     ON CONFLICT (project_id, employee_id) DO UPDATE SET access_level = EXCLUDED.access_level
     RETURNING *`,
    [id, employee_id, access_level, req.user.id]
  );
  const project = await pool.query("SELECT name FROM projects WHERE id = $1", [id]);
  await notify(employee_id, `You now have access to project "${project.rows[0]?.name}".`, `/projects/${id}`);
  res.status(201).json(result.rows[0]);
});

router.get("/:id/stats", requireAuth, requireManager, async (req, res) => {
  const { id } = req.params;

  const byPhase = await pool.query(
    `SELECT ph.number, ph.name_en,
            COALESCE(SUM(EXTRACT(EPOCH FROM (d.time_to - d.time_from)) / 3600), 0) AS hours
     FROM project_phases ph
     LEFT JOIN diary_entries d ON d.phase_id = ph.id AND d.project_id = $1
     GROUP BY ph.number, ph.name_en
     ORDER BY ph.number`,
    [id]
  );

  const byEmployee = await pool.query(
    `SELECT u.id, u.full_name,
            COALESCE(SUM(EXTRACT(EPOCH FROM (d.time_to - d.time_from)) / 3600), 0) AS hours
     FROM diary_entries d
     JOIN users u ON u.id = d.employee_id
     WHERE d.project_id = $1
     GROUP BY u.id, u.full_name
     ORDER BY hours DESC`,
    [id]
  );

  res.json({ byPhase: byPhase.rows, byEmployee: byEmployee.rows });
});

module.exports = router;
