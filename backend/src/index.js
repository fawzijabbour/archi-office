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
