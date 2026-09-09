const fs = require("fs");
const path = require("path");
const { pool } = require("./db");

// schema.sql only uses CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING,
// so re-running it is always safe but won't add columns to a table that
// already exists. Those go here as idempotent ALTER TABLE statements —
// add a line here whenever a column is added to an existing table in
// schema.sql, or existing installs won't pick it up.
const COLUMN_MIGRATIONS = [
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_contact VARCHAR(150)`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50)`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_email VARCHAR(150)`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_notes TEXT`,
  `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recurrence VARCHAR(20) NOT NULL DEFAULT 'none'`,
  `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recurrence_end DATE`,
];

async function waitForDb(retries = 20, delayMs = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      console.log(`Waiting for database... (attempt ${i + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("Database did not become ready in time");
}

async function runMigrations() {
  await waitForDb();

  const schemaSql = fs.readFileSync(path.join(__dirname, "sql", "schema.sql"), "utf8");
  await pool.query(schemaSql);

  for (const statement of COLUMN_MIGRATIONS) {
    await pool.query(statement);
  }

  console.log("Database schema is up to date.");
}

module.exports = { runMigrations };
