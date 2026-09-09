const express = require("express");
const QRCode = require("qrcode");
const { pool } = require("../db");
const { requireAuth, requireManager } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, requireManager, async (req, res) => {
  const result = await pool.query(
    `SELECT id, full_name, email, role, is_active, vacation_days_total, vacation_days_used, created_at
     FROM users ORDER BY full_name ASC`
  );
  res.json(result.rows);
});

router.get("/:id/qrcode", requireAuth, async (req, res) => {
  const { id } = req.params;
  if (req.user.role !== "manager" && req.user.id !== id) {
    return res.status(403).json({ error: "Not allowed" });
  }
  const result = await pool.query("SELECT qr_token FROM users WHERE id = $1", [id]);
  if (!result.rows.length) return res.status(404).json({ error: "User not found" });

  try {
    const pngBuffer = await QRCode.toBuffer(result.rows[0].qr_token, { width: 320, margin: 2 });
    res.setHeader("Content-Type", "image/png");
    res.send(pngBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

router.patch("/:id", requireAuth, requireManager, async (req, res) => {
  const { id } = req.params;
  const { is_active, vacation_days_total } = req.body;
  const fields = [];
  const values = [];
  let i = 1;

  if (is_active !== undefined) {
    fields.push(`is_active = $${i++}`);
    values.push(is_active);
  }
  if (vacation_days_total !== undefined) {
    fields.push(`vacation_days_total = $${i++}`);
    values.push(vacation_days_total);
  }
  if (!fields.length) return res.status(400).json({ error: "No fields to update" });

  values.push(id);
  const result = await pool.query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${i} RETURNING id, full_name, email, is_active, vacation_days_total`,
    values
  );
  res.json(result.rows[0]);
});

module.exports = router;
