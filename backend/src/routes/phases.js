const express = require("express");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const result = await pool.query("SELECT * FROM project_phases ORDER BY number ASC");
  res.json(result.rows);
});

module.exports = router;
