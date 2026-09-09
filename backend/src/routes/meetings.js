const express = require("express");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { notifyMany } = require("../notify");

const router = express.Router();

const VALID_RECURRENCE = ["none", "daily", "weekly", "monthly"];

function addInterval(date, recurrence, n) {
  const d = new Date(date);
  if (recurrence === "daily") d.setDate(d.getDate() + n);
  else if (recurrence === "weekly") d.setDate(d.getDate() + 7 * n);
  else if (recurrence === "monthly") d.setMonth(d.getMonth() + n);
  return d;
}

// A recurring meeting is stored as a single row (its first occurrence) and
// expanded here into individual occurrences. Editing or deleting always
// acts on the whole series.
function expandOccurrences(meeting, rangeFrom, rangeTo) {
  if (!meeting.recurrence || meeting.recurrence === "none") return [meeting];

  const duration = new Date(meeting.end_time) - new Date(meeting.start_time);
  const hardStop = meeting.recurrence_end ? new Date(`${meeting.recurrence_end}T23:59:59`) : null;
  const occurrences = [];
  const CAP = 300;

  for (let n = 0; n < CAP; n++) {
    const occStart = addInterval(meeting.start_time, meeting.recurrence, n);
    if (hardStop && occStart > hardStop) break;
    if (rangeTo && occStart > rangeTo) break;
    const occEnd = new Date(occStart.getTime() + duration);
    if (!rangeFrom || occEnd >= rangeFrom) {
      occurrences.push({ ...meeting, start_time: occStart.toISOString(), end_time: occEnd.toISOString() });
    }
  }
  return occurrences;
}

router.post("/", requireAuth, async (req, res) => {
  const { title, project_id, start_time, end_time, location, notes, attendee_ids, recurrence, recurrence_end } = req.body;
  if (!title || !start_time || !end_time) {
    return res.status(400).json({ error: "title, start_time, end_time are required" });
  }
  const rec = recurrence && VALID_RECURRENCE.includes(recurrence) ? recurrence : "none";
  if (rec !== "none" && !recurrence_end) {
    return res.status(400).json({ error: "recurrence_end is required for a recurring meeting" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO meetings (title, project_id, start_time, end_time, location, notes, recurrence, recurrence_end, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, project_id || null, start_time, end_time, location || null, notes || null, rec, rec !== "none" ? recurrence_end : null, req.user.id]
    );
    const meeting = result.rows[0];

    const attendees = [...new Set([...(attendee_ids || []), req.user.id])];
    if (attendees.length) {
      const values = attendees.map((_, i) => `($1, $${i + 2})`).join(",");
      await pool.query(
        `INSERT INTO meeting_attendees (meeting_id, user_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        [meeting.id, ...attendees]
      );
    }

    const others = attendees.filter((id) => id !== req.user.id);
    const recurrenceNote = rec !== "none" ? ` (repeats ${rec})` : "";
    await notifyMany(
      others,
      `New meeting: "${title}" on ${new Date(start_time).toLocaleString()}${recurrenceNote}`,
      `/calendar`
    );

    res.status(201).json(meeting);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create meeting" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  const { from, to, project_id } = req.query;
  const conditions = [];
  const params = [];
  let i = 1;

  if (req.user.role !== "manager") {
    conditions.push(`(m.created_by = $${i} OR ma.user_id = $${i})`);
    params.push(req.user.id);
    i++;
  }
  if (project_id) {
    conditions.push(`m.project_id = $${i++}`);
    params.push(project_id);
  }
  // A recurring series' stored start_time may be long before the requested
  // range, so date filtering happens after expansion below instead of here.

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query(
    `SELECT DISTINCT m.*, p.name AS project_name, p.code AS project_code
     FROM meetings m
     LEFT JOIN meeting_attendees ma ON ma.meeting_id = m.id
     LEFT JOIN projects p ON p.id = m.project_id
     ${where}
     ORDER BY m.start_time ASC`,
    params
  );

  const meetingIds = result.rows.map((r) => r.id);
  let attendeesByMeeting = {};
  if (meetingIds.length) {
    const att = await pool.query(
      `SELECT ma.meeting_id, u.id, u.full_name
       FROM meeting_attendees ma JOIN users u ON u.id = ma.user_id
       WHERE ma.meeting_id = ANY($1::uuid[])`,
      [meetingIds]
    );
    attendeesByMeeting = att.rows.reduce((acc, row) => {
      acc[row.meeting_id] = acc[row.meeting_id] || [];
      acc[row.meeting_id].push({ id: row.id, full_name: row.full_name });
      return acc;
    }, {});
  }

  const rangeFrom = from ? new Date(from) : null;
  const rangeTo = to ? new Date(to) : null;

  const expanded = result.rows.flatMap((r) =>
    expandOccurrences(r, rangeFrom, rangeTo).map((occ) => ({ ...occ, attendees: attendeesByMeeting[r.id] || [] }))
  );

  res.json(expanded.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
});

router.get("/:id/ics", requireAuth, async (req, res) => {
  const { id } = req.params;
  const result = await pool.query("SELECT * FROM meetings WHERE id = $1", [id]);
  if (!result.rows.length) return res.status(404).json({ error: "Meeting not found" });
  const m = result.rows[0];

  if (req.user.role !== "manager") {
    const access = await pool.query(
      "SELECT 1 FROM meeting_attendees WHERE meeting_id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (!access.rows.length && m.created_by !== req.user.id) {
      return res.status(403).json({ error: "Not allowed" });
    }
  }

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${m.title.replace(/[^a-z0-9]/gi, "_")}.ics"`);
  res.send(buildICS(m));
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query("SELECT * FROM meetings WHERE id = $1", [id]);
  if (!existing.rows.length) return res.status(404).json({ error: "Meeting not found" });
  if (req.user.role !== "manager" && existing.rows[0].created_by !== req.user.id) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const { title, start_time, end_time, location, notes, recurrence, recurrence_end } = req.body;
  const fields = [];
  const values = [];
  let i = 1;
  const map = { title, start_time, end_time, location, notes, recurrence, recurrence_end };
  for (const [key, val] of Object.entries(map)) {
    if (val !== undefined) {
      fields.push(`${key} = $${i++}`);
      values.push(val);
    }
  }
  if (!fields.length) return res.status(400).json({ error: "No fields to update" });
  values.push(id);
  const result = await pool.query(`UPDATE meetings SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`, values);
  res.json(result.rows[0]);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query("SELECT * FROM meetings WHERE id = $1", [id]);
  if (!existing.rows.length) return res.status(404).json({ error: "Meeting not found" });
  if (req.user.role !== "manager" && existing.rows[0].created_by !== req.user.id) {
    return res.status(403).json({ error: "Not allowed" });
  }
  await pool.query("DELETE FROM meetings WHERE id = $1", [id]);
  res.json({ ok: true });
});

function icsEscape(text) {
  return String(text || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsDate(d) {
  return new Date(d).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function buildICS(m) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ArchiOffice//Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${m.id}@archioffice`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(m.start_time)}`,
    `DTEND:${icsDate(m.end_time)}`,
    `SUMMARY:${icsEscape(m.title)}`,
  ];
  if (m.location) lines.push(`LOCATION:${icsEscape(m.location)}`);
  if (m.notes) lines.push(`DESCRIPTION:${icsEscape(m.notes)}`);
  if (m.recurrence && m.recurrence !== "none") {
    const freq = { daily: "DAILY", weekly: "WEEKLY", monthly: "MONTHLY" }[m.recurrence];
    const until = m.recurrence_end ? `;UNTIL=${icsDate(`${m.recurrence_end}T23:59:59Z`)}` : "";
    lines.push(`RRULE:FREQ=${freq}${until}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

module.exports = router;
