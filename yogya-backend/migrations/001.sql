CREATE TABLE yogya_accounts (
 id TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('student','facilitator')),
 token_hash TEXT UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE yogya_students (
 id TEXT PRIMARY KEY, account_id TEXT UNIQUE NOT NULL REFERENCES yogya_accounts(id),
 profile JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE yogya_assignments (
 facilitator_id TEXT NOT NULL REFERENCES yogya_accounts(id),
 student_id TEXT NOT NULL REFERENCES yogya_students(id),
 PRIMARY KEY(facilitator_id,student_id)
);
CREATE TABLE yogya_saved (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES yogya_students(id),
 opportunity_id VARCHAR(80) NOT NULL REFERENCES opportunities(opportunity_id),
 saved BOOLEAN NOT NULL DEFAULT TRUE, version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0), UNIQUE(student_id,opportunity_id)
);
CREATE TABLE yogya_checklist (
 id TEXT PRIMARY KEY, saved_id TEXT NOT NULL REFERENCES yogya_saved(id),
 title TEXT NOT NULL, description TEXT, source_reference TEXT,
 completed BOOLEAN NOT NULL DEFAULT FALSE,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX yogya_checklist_saved ON yogya_checklist(saved_id);
CREATE TABLE yogya_operations (
 account_id TEXT NOT NULL REFERENCES yogya_accounts(id),
 operation_id UUID NOT NULL, request_hash TEXT NOT NULL, response JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,operation_id)
);
