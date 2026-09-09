const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../db");
const { requireAuth, requireManager } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1 AND is_active = TRUE", [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    delete user.password_hash;
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT id, full_name, email, role, qr_token, vacation_days_total, vacation_days_used FROM users WHERE id = $1",
    [req.user.id]
  );
  res.json(result.rows[0]);
});

router.post("/register-employee", requireAuth, requireManager, async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: "full_name, email, password are required" });
  }
  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length) return res.status(409).json({ error: "Email already registered" });

    const password_hash = await bcrypt.hash(password, 10);
    const qr_token = uuidv4();

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, qr_token)
       VALUES ($1, $2, $3, 'employee', $4)
       RETURNING id, full_name, email, role, qr_token, created_at`,
      [full_name, email, password_hash, qr_token]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create employee" });
  }
});

router.patch("/change-password", requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: "current_password and new_password are required" });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
  if (!result.rows.length) return res.status(404).json({ error: "User not found" });

  const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

  const password_hash = await bcrypt.hash(new_password, 10);
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [password_hash, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
