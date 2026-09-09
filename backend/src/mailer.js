// Optional SMTP email delivery. If SMTP_HOST isn't set, sendMail() is a no-op.
let transporter = null;

function getTransporter() {
  if (transporter !== null) return transporter;
  if (!process.env.SMTP_HOST) {
    transporter = false;
    return transporter;
  }
  try {
    const nodemailer = require("nodemailer");
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } catch (err) {
    console.warn("SMTP_HOST is set but the nodemailer package failed to load — email delivery disabled.", err.message);
    transporter = false;
  }
  return transporter;
}

async function sendMail(to, subject, text) {
  const t = getTransporter();
  if (!t || !to) return;
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || "ArchiOffice <no-reply@archioffice.local>",
      to,
      subject,
      text,
    });
  } catch (err) {
    console.warn("Failed to send notification email:", err.message);
  }
}

module.exports = { sendMail };
