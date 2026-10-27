CREATE TABLE IF NOT EXISTS portal_invitations (
  token_hash TEXT PRIMARY KEY,
  society_id TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS invitations_society ON portal_invitations(society_id);
CREATE TABLE IF NOT EXISTS portal_sessions (
  token_hash TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'secretary')),
  society_id TEXT,
  label TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_society ON portal_sessions(society_id);
CREATE TABLE IF NOT EXISTS portal_profiles (
  society_id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  modified_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS portal_events (
  event_id TEXT PRIMARY KEY,
  society_id TEXT NOT NULL,
  data_json TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  modified_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_society ON portal_events(society_id);
CREATE TABLE IF NOT EXISTS portal_rate_limits (
  rate_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS portal_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  society_id TEXT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  object_id TEXT,
  created_at TEXT NOT NULL
);
