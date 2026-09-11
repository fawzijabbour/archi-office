require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { UPLOAD_DIR } = require("./upload");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const phasesRoutes = require("./routes/phases");
const projectsRoutes = require("./routes/projects");
const attendanceRoutes = require("./routes/attendance");
const diaryRoutes = require("./routes/diary");
const vacationRoutes = require("./routes/vacation");
const tasksRoutes = require("./routes/tasks");
const meetingsRoutes = require("./routes/meetings");
const notificationsRoutes = require("./routes/notifications");
const statsRoutes = require("./routes/stats");

const app = express();

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true;
app.use(cors({ origin: corsOrigin }));

app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/", (req, res) => res.json({ service: "ArchiOffice API", health: "/api/health" }));
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/phases", phasesRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/diary", diaryRoutes);
app.use("/api/vacation", vacationRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/meetings", meetingsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/stats", statsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
