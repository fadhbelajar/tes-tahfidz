-- Tambahan tabel untuk pengajuan cuti ustadzah (sinkron cloud)
CREATE TABLE IF NOT EXISTS leaves (
  id   TEXT PRIMARY KEY,
  json TEXT NOT NULL
);
