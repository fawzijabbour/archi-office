# ArchiOffice — Architecture Office Management System

Full-stack practice management system for architecture offices, built around the
German **HOAI 9-phase (Leistungsphasen)** project workflow.

## Stack
- Frontend: React 18 + Vite + Tailwind (drafting-table aesthetic: warm paper,
  ink text, blueprint blue accent, rust/redline for warnings), charts via Recharts
- Backend: Node.js + Express, hardened with helmet, request logging, and
  configurable CORS
- Database: PostgreSQL, schema applied and kept up to date by a startup migration
- Auth: JWT, role-based (manager / employee)
- Orchestration: Docker Compose (separate dev and production configs; nginx
  serves the production frontend build and reverse-proxies the API)
- Tests: Jest + Supertest (backend), Vitest + Testing Library (frontend)

## Sections

**Dashboard** — a quick daily overview. Employees see their attendance QR
code, today's log, and upcoming meetings. Managers see headline stats,
today's attendance log, pending vacation requests, and upcoming meetings.

**Journal** — an employee's work diary, as its own section (separate from
the dashboard). Each entry: project (by code), one of the 9 HOAI phases,
time range, location (office/site/client/home), description, optional file.
Filterable by date and project, with a running hours total.

**Calendar** — a month grid for planning meetings. Click a day to see its
agenda and add a meeting (title, time range, optional linked project,
location, recurrence, and — for managers — attendees). Meetings tied to a
project can be scheduled directly from that project's page. Any meeting can
be downloaded as a `.ics` calendar invite.

**Projects** — each project has its own page: a **Customer** panel (contact
person, phone, email, notes, last/next meeting — editable by managers),
the main plan (previewed inline for images and PDFs; other formats like DWG
or RVT get a labeled download card since browsers can't render them), files,
an updates feed, phase tracking, and (for managers) hour statistics by phase
and by employee. Employees only see a project if a manager grants them
permission.

**Tasks** — managers assign tasks to individual employees or to groups.

**Vacation** — employees submit requests; managers Accept, Deny, or
Counter-offer with different dates.

**Team** *(manager only)* — register employee accounts, view any employee's
attendance QR code, activate/deactivate accounts, create groups.

**Reports** *(manager only)* — company-wide charts (a 14-day hours trend,
hours by project, hours by phase) plus a per-employee table — hours today /
this week / this month, pause time, vacation used vs. total — that expands
into a worked-vs-paused daily chart and a hours-by-project breakdown for
that employee.

**Account** — change your password. Reachable from the sidebar under your
name.

**Notifications** — a bell in the top bar. Employees are notified when a
task is assigned, a vacation request is decided, they're added to a
meeting, or a project they have access to gets an update. Managers are
notified when an employee submits a vacation request. If SMTP is configured
(see below), the same notifications are also emailed.

## The 9 HOAI Phases (Leistungsphasen)

| LP | German | English |
|----|--------|---------|
| 1 | Grundlagenermittlung | Basic Evaluation |
| 2 | Vorplanung | Preliminary Design |
| 3 | Entwurfsplanung | Design Planning |
| 4 | Genehmigungsplanung | Approval Planning |
| 5 | Ausführungsplanung | Execution Planning |
| 6 | Vorbereitung der Vergabe | Tender Preparation |
| 7 | Mitwirkung bei der Vergabe | Tender Assistance |
| 8 | Objektüberwachung | Construction Supervision |
| 9 | Objektbetreuung | Project Support / Close-out |

## Running it (development)

```bash
docker compose up --build
```

The backend applies (and upgrades) the database schema automatically on
every startup — see **Database migrations** below. Then create the default
manager account (one-time):

```bash
docker compose exec backend npm run seed
```

This prints the default manager login:
- email: `manager@archi.local`
- password: `Manager123!`

Change it right away from **Account** in the sidebar once you're logged in.

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api (also reachable at `/api` through
  the frontend dev server, which proxies it)
- Health check: http://localhost:4000/api/health

## Deployment (production)

```bash
cp .env.example .env   # fill in POSTGRES_PASSWORD and JWT_SECRET
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml exec backend npm run seed
```

This builds the frontend as a static bundle served by nginx (`frontend/Dockerfile.prod`
+ `frontend/nginx.conf`), which also reverse-proxies `/api` and `/uploads` to
the backend — so the whole app is one origin and there's nothing to expose
but port 80 (set `HTTP_PORT` in `.env` to change it). `POSTGRES_PASSWORD`
and `JWT_SECRET` have no fallback in this file — compose will refuse to
start without them. The database port isn't published to the host either.

Put a real TLS-terminating reverse proxy (Caddy, Traefik, or another nginx)
in front of this for HTTPS — the bundled nginx only serves plain HTTP
inside the compose network.

## Database migrations

`schema.sql` is written entirely with `CREATE TABLE IF NOT EXISTS` and
`ON CONFLICT DO NOTHING`, so it's always safe to re-run against an existing
database — it only fills in what's missing. That alone isn't enough for
*column* additions to a table that already exists, though (Postgres won't
add `client_contact` to your `projects` table just because a newer
`schema.sql` mentions it). So `backend/src/migrate.js` runs on every backend
startup and:

1. waits for the database to accept connections,
2. re-runs `schema.sql`,
3. applies a short list of explicit `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
   statements for columns added after the first release.

This means `docker compose up` after pulling a newer version of this project
will upgrade your existing database in place — you don't need to wipe the
`pgdata` volume. If you add a new column to a table in `schema.sql` going
forward, add the matching line to `COLUMN_MIGRATIONS` in `migrate.js` too,
or existing installs won't pick it up.

## Local dev without Docker

Backend:
```bash
cd backend
cp .env.example .env
npm install
# make sure Postgres is running locally and DATABASE_URL in .env points to it
npm run seed
npm run dev
```
(`npm run dev` / `npm start` both run the migration automatically before
listening — no separate migrate step needed.)

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Tests

Backend (Jest + Supertest — route validation and auth-guard behavior, no
database required):
```bash
cd backend
npm install
npm test
```

Frontend (Vitest + Testing Library — component smoke tests):
```bash
cd frontend
npm install
npm test
```

## Optional: email delivery for notifications

Notifications are in-app by default. To also send them by email, set the
`SMTP_*` variables in the root `.env` file (used by both compose files):

```
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_FROM=ArchiOffice <no-reply@yourdomain.com>
```

Leave `SMTP_HOST` empty and nothing changes — email sending is skipped
silently, notifications stay in-app only. Delivery is always best-effort: a
failed or unconfigured email never blocks the in-app notification.

Real push notifications (to a phone or browser) would need a service worker
and a push subscription per device/browser, which is a separate, larger
piece of infrastructure — out of scope here. Email is the practical
"reaches you outside the app" channel for now.

## Creating employees

Log in as the manager and go to **Team** in the sidebar. From there you can:
- Register new employee accounts (name, email, temporary password)
- View any employee's attendance QR code
- Activate / deactivate accounts
- Create groups and assign members (used for group-targeted tasks)

Each new employee gets a unique `qr_token` at creation. Their own QR code
(visible on their dashboard once they log in) is what the attendance scan
page reads.

Project-level access is granted separately, from each project's own page
(**Projects → a project**, manager view): assign an employee to the project
(lets them log journal entries against it) and/or grant them page access
(lets them view the plan, files, and updates — `view` or `edit`).

## API surface (backend)

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/register-employee`, `PATCH /api/auth/change-password` |
| Users | `GET /api/users`, `GET /api/users/:id/qrcode`, `PATCH /api/users/:id` |
| Phases | `GET /api/phases` |
| Attendance | `POST /api/attendance/scan`, `GET /api/attendance/today`, `GET /api/attendance/summary` |
| Diary (Journal) | `POST /api/diary`, `GET /api/diary/mine`, `GET /api/diary/project/:projectId` |
| Projects | `POST/GET/PATCH /api/projects`, `.../files`, `.../updates`, `.../assign`, `.../permissions`, `.../stats` |
| Tasks | `POST/GET /api/tasks`, `PATCH /api/tasks/:id/status`, `.../groups` |
| Vacation | `POST/GET /api/vacation`, `PATCH /api/vacation/:id/decide` |
| Meetings (Calendar) | `POST/GET/PATCH/DELETE /api/meetings`, `GET /api/meetings/:id/ics` |
| Notifications | `GET /api/notifications/mine`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` |
| Stats (Reports) | `GET /api/stats/employees`, `GET /api/stats/employees/:id`, `GET /api/stats/overview` |

## Not yet built (next milestones)
- Editing or canceling a single occurrence of a recurring meeting (currently
  any change applies to the whole series)
- Real push notifications (would need a service worker + per-device
  subscriptions — see the email section above for why that's out of scope
  for now)
- Broader test coverage (the current suites are a solid starting skeleton,
  not exhaustive)

## Notes
- File uploads are stored on a Docker volume and served from `/uploads`.
- The attendance sequence is enforced server-side: check_in → (pause_start ⇄
  pause_end) → check_out. Out-of-order scans are rejected with a clear error.
- Project visibility for employees is permission-based (`project_permissions`),
  separate from `project_assignments` (which is about being assigned to do the
  work / log journal entries against it).
- Report hours are computed from journal entries (`diary_entries`); pause
  totals are computed by pairing `pause_start`/`pause_end` attendance events
  chronologically per employee.
- A recurring meeting is stored as one row (its first occurrence) and
  expanded into individual occurrences when the calendar queries a date
  range; editing or deleting acts on the whole series.
- The backend Docker image runs as a non-root user, and the production
  compose file requires `POSTGRES_PASSWORD`/`JWT_SECRET` to be set — there
  are no insecure fallback defaults in `docker-compose.prod.yml`.
