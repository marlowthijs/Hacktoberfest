CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  refresh_token_enc TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_sync_at TEXT,
  last_sync_error TEXT
);

CREATE TABLE societies (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  society_id TEXT NOT NULL REFERENCES societies(id),
  title TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (end_at > start_at)
);

CREATE TABLE subscriptions (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  society_id TEXT NOT NULL REFERENCES societies(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, society_id)
);

CREATE TABLE calendar_entries (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id),
  google_event_id TEXT NOT NULL,
  synced_at TEXT NOT NULL,
  PRIMARY KEY (user_id, event_id),
  UNIQUE (user_id, google_event_id)
);

CREATE INDEX events_status_start ON events(status, start_at);
CREATE INDEX events_society_status_start ON events(society_id, status, start_at);
CREATE INDEX subscriptions_society ON subscriptions(society_id);
CREATE INDEX calendar_entries_event ON calendar_entries(event_id);

INSERT INTO societies (id, slug, name, abbreviation, description, created_at)
VALUES (
  'society-ecss',
  'ecss',
  'Engineering & Computer Science Society',
  'ECSS',
  'A home for curious builders, problem solvers, and people who like making things together.',
  '2026-10-24T00:00:00.000Z'
);

-- Kept as a draft so the supplied example is visible to the team without being sent to calendars.
INSERT INTO events (id, society_id, title, start_at, end_at, location, description, status, created_at, updated_at)
VALUES (
  'example-hacktoberfest-event',
  'society-ecss',
  'Hacktoberfest',
  '2026-10-24T08:45:00.000Z',
  '2026-10-24T19:00:00.000Z',
  'Building 60 West',
  'Example event from the Society Synth brief. Replace or reschedule this draft before publishing.',
  'draft',
  '2026-10-24T00:00:00.000Z',
  '2026-10-24T00:00:00.000Z'
);
