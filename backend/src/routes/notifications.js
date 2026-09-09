const express = require("express");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/mine", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    [req.user.id]
  );
  res.json(result.rows);
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  const result = await pool.query(
    "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *",
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) return res.status(404).json({ error: "Notification not found" });
  res.json(result.rows[0]);
});

router.patch("/read-all", requireAuth, async (req, res) => {
  await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE", [req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
