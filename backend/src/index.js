require("dotenv").config();

const REQUIRED_ENV = ["JWT_SECRET", "DATABASE_URL"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  console.error("Set them in your hosting platform's service variables before starting the server.");
  process.exit(1);
}

const app = require("./app");
const { runMigrations } = require("./migrate");

const PORT = process.env.PORT || 4000;

runMigrations()
  .then(() => {
    app.listen(PORT, () => console.log(`Archi Office backend running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to run database migrations — server not started.", err);
    process.exit(1);
  });
