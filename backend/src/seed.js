require("dotenv").config();
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("./db");

async function seed() {
  const email = "manager@archi.local";
  const password = "Manager123!";

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length) {
    console.log("Default manager already exists:", email);
    process.exit(0);
  }

  const password_hash = await bcrypt.hash(password, 10);
  const qr_token = uuidv4();

  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, qr_token)
     VALUES ($1,$2,$3,'manager',$4)`,
    ["Office Manager", email, password_hash, qr_token]
  );

  console.log("Default manager created:");
  console.log("  email:   ", email);
  console.log("  password:", password);
  console.log("(change this password after first login)");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
