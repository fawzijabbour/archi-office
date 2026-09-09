const express = require("express");
const { pool } = require("../db");
const { requireAuth, requireManager } = require("../middleware/auth");
const { notify, notifyMany } = require("../notify");

const router = express.Router();


router.post("/groups", requireAuth, requireManager, async (req, res) => {
  const { name, member_ids } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const group = await pool.query(
    "INSERT INTO groups (name, created_by) VALUES ($1,$2) RETURNING *",
    [name, req.user.id]
  );
  if (Array.isArray(member_ids) && member_ids.length) {
    const values = member_ids.map((_, i) => `($1, $${i + 2})`).join(",");
    await pool.query(
      `INSERT INTO group_members (group_id, employee_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      [group.rows[0].id, ...member_ids]
    );
  }
  res.status(201).json(group.rows[0]);
});

router.get("/groups", requireAuth, requireManager, async (req, res) => {
  const result = await pool.query(`
    SELECT g.*, COALESCE(json_agg(json_build_object('id', u.id, 'full_name', u.full_name))
           FILTER (WHERE u.id IS NOT NULL), '[]') AS members
    FROM groups g
    LEFT JOIN group_members gm ON gm.group_id = g.id
    LEFT JOIN users u ON u.id = gm.employee_id
    GROUP BY g.id ORDER BY g.created_at DESC
  `);
  res.json(result.rows);
});


router.post("/", requireAuth, requireManager, async (req, res) => {
  const { title, description, project_id, assignee_id, group_id, due_date } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  if (!assignee_id && !group_id) return res.status(400).json({ error: "assignee_id or group_id is required" });

  const result = await pool.query(
    `INSERT INTO tasks (title, description, project_id, assignee_id, group_id, due_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [title, description || null, project_id || null, assignee_id || null, group_id || null, due_date || null, req.user.id]
  );

  if (assignee_id) {
    await notify(assignee_id, `New task assigned: "${title}"`, "/tasks");
  } else if (group_id) {
    const members = await pool.query("SELECT employee_id FROM group_members WHERE group_id = $1", [group_id]);
    await notifyMany(members.rows.map((m) => m.employee_id), `New task assigned: "${title}"`, "/tasks");
  }

  res.status(201).json(result.rows[0]);
});

router.get("/mine", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT DISTINCT t.* FROM tasks t
     LEFT JOIN group_members gm ON gm.group_id = t.group_id AND gm.employee_id = $1
     WHERE t.assignee_id = $1 OR gm.employee_id = $1
     ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`,
    [req.user.id]
  );
  res.json(result.rows);
});

router.get("/", requireAuth, requireManager, async (req, res) => {
  const result = await pool.query(`
    SELECT t.*, u.full_name AS assignee_name, g.name AS group_name, p.name AS project_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    LEFT JOIN groups g ON g.id = t.group_id
    LEFT JOIN projects p ON p.id = t.project_id
    ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
  `);
  res.json(result.rows);
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["todo", "in_progress", "done"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  if (req.user.role !== "manager") {
    const task = await pool.query(
      `SELECT t.* FROM tasks t
       LEFT JOIN group_members gm ON gm.group_id = t.group_id AND gm.employee_id = $2
       WHERE t.id = $1 AND (t.assignee_id = $2 OR gm.employee_id = $2)`,
      [id, req.user.id]
    );
    if (!task.rows.length) return res.status(403).json({ error: "Not your task" });
  }

  const result = await pool.query("UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *", [status, id]);
  res.json(result.rows[0]);
});

module.exports = router;
