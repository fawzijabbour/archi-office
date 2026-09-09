const { pool } = require("./db");
const { sendMail } = require("./mailer");

async function notify(user_id, message, link = null) {
  if (!user_id) return;
  await pool.query(
    "INSERT INTO notifications (user_id, message, link) VALUES ($1,$2,$3)",
    [user_id, message, link]
  );

  const user = await pool.query("SELECT email FROM users WHERE id = $1", [user_id]);
  if (user.rows[0]?.email) {
    sendMail(user.rows[0].email, "ArchiOffice notification", message).catch(() => {});
  }
}

async function notifyMany(user_ids, message, link = null) {
  const ids = [...new Set((user_ids || []).filter(Boolean))];
  for (const id of ids) {
    await notify(id, message, link);
  }
}

module.exports = { notify, notifyMany };
