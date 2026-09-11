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
  if (err.code === "ENOTFOUND" && /\.railway\.internal$/.test(err.hostname || "")) {
    console.error(
      `Cannot reach ${err.hostname} from outside Railway's network. If you're running this ` +
      "locally, set DATABASE_URL to the PUBLIC connection string (Postgres service → Connect " +
      "tab, ends in .proxy.rlwy.net) instead of the internal one."
    );
  } else if (err.code === "ECONNREFUSED") {
    console.error(
      "Could not connect to the database — DATABASE_URL is missing or points to a database " +
      "that isn't reachable. Check it's set correctly for wherever this is running."
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
