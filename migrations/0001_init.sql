-- Cloudflare D1 schema for E-Tahfidz Al Mawaddah
-- Each main collection is stored as rows of (id, json) for easy sync.
-- Settings are key/value pairs; master lists are typed values.

CREATE TABLE IF NOT EXISTS students (
  id   TEXT PRIMARY KEY,
  json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teachers (
  id   TEXT PRIMARY KEY,
  json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deposits (
  id   TEXT PRIMARY KEY,
  json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS news (
  id   TEXT PRIMARY KEY,
  json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id   TEXT PRIMARY KEY,
  json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS masters (
  type  TEXT NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_masters_type ON masters(type);
