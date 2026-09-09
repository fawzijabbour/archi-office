-- Architecture Office Management System - Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- USERS ----------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('manager','employee')),
    qr_token        VARCHAR(255) UNIQUE NOT NULL,
    vacation_days_total   INT NOT NULL DEFAULT 24,
    vacation_days_used    INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- HOAI PROJECT PHASES (fixed lookup, 9 German phases) ----------
CREATE TABLE IF NOT EXISTS project_phases (
    id          SMALLINT PRIMARY KEY,
    number      SMALLINT NOT NULL UNIQUE,
    name_de     VARCHAR(100) NOT NULL,
    name_en     VARCHAR(100) NOT NULL
);

INSERT INTO project_phases (id, number, name_de, name_en) VALUES
 (1,1,'Grundlagenermittlung','Basic Evaluation'),
 (2,2,'Vorplanung','Preliminary Design'),
 (3,3,'Entwurfsplanung','Design Planning'),
 (4,4,'Genehmigungsplanung','Approval Planning'),
 (5,5,'Ausführungsplanung','Execution Planning'),
 (6,6,'Vorbereitung der Vergabe','Tender Preparation'),
 (7,7,'Mitwirkung bei der Vergabe','Tender Assistance'),
 (8,8,'Objektüberwachung','Construction Supervision'),
 (9,9,'Objektbetreuung','Project Support / Close-out')
ON CONFLICT (id) DO NOTHING;

-- ---------- PROJECTS ----------
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(30) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    client_name     VARCHAR(150),
    client_contact  VARCHAR(150),
    client_phone    VARCHAR(50),
    client_email    VARCHAR(150),
    client_notes    TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','completed','cancelled')),
    current_phase_id SMALLINT REFERENCES project_phases(id),
    main_plan_file  VARCHAR(500),
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- PROJECT FILES ----------
CREATE TABLE IF NOT EXISTS project_files (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_url    VARCHAR(500) NOT NULL,
    file_name   VARCHAR(255) NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- PROJECT UPDATES (manager-posted or auto from diary) ----------
CREATE TABLE IF NOT EXISTS project_updates (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    author_id   UUID REFERENCES users(id),
    message     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- PROJECT PERMISSIONS (employee access grants) ----------
CREATE TABLE IF NOT EXISTS project_permissions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_level VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (access_level IN ('view','edit')),
    granted_by   UUID REFERENCES users(id),
    granted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, employee_id)
);

-- Separate from view permission: whether an employee is assigned to do the work.
CREATE TABLE IF NOT EXISTS project_assignments (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, employee_id)
);

-- ---------- ATTENDANCE LOGS (QR scan events) ----------
CREATE TABLE IF NOT EXISTS attendance_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type  VARCHAR(20) NOT NULL CHECK (event_type IN ('check_in','pause_start','pause_end','check_out')),
    event_time  TIMESTAMPTZ NOT NULL DEFAULT now(),
    work_date   DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_logs(employee_id, work_date);

-- ---------- WORK DIARY ENTRIES ----------
CREATE TABLE IF NOT EXISTS diary_entries (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id    SMALLINT NOT NULL REFERENCES project_phases(id),
    entry_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    time_from   TIME NOT NULL,
    time_to     TIME NOT NULL,
    location    VARCHAR(20) NOT NULL CHECK (location IN ('office','site','home','client')),
    description TEXT,
    file_url    VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (time_to > time_from)
);

CREATE INDEX IF NOT EXISTS idx_diary_employee_date ON diary_entries(employee_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_diary_project ON diary_entries(project_id);

-- ---------- GROUPS ----------
CREATE TABLE IF NOT EXISTS groups (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(150) NOT NULL,
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, employee_id)
);

-- ---------- TASKS ----------
CREATE TABLE IF NOT EXISTS tasks (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    group_id    UUID REFERENCES groups(id) ON DELETE SET NULL,
    due_date    DATE,
    status      VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (assignee_id IS NOT NULL OR group_id IS NOT NULL)
);

-- ---------- VACATION REQUESTS ----------
CREATE TABLE IF NOT EXISTS vacation_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    reason          TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','denied','countered','withdrawn')),
    counter_start   DATE,
    counter_end     DATE,
    manager_note    TEXT,
    decided_by      UUID REFERENCES users(id),
    decided_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);

-- ---------- MEETINGS (calendar) ----------
CREATE TABLE IF NOT EXISTS meetings (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       VARCHAR(200) NOT NULL,
    project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
    start_time  TIMESTAMPTZ NOT NULL,
    end_time    TIMESTAMPTZ NOT NULL,
    location    VARCHAR(200),
    notes       TEXT,
    recurrence      VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekly','monthly')),
    recurrence_end  DATE,
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS meeting_attendees (
    meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meetings_project ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_start ON meetings(start_time);

-- ---------- NOTIFICATIONS ----------
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    link        VARCHAR(300),
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- The default manager account is created by `npm run seed`, not here,
-- so the password hash is generated correctly with bcrypt at runtime.
