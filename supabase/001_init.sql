-- ============================================================
-- CGD Sales Dashboard — Migration 001 (FINAL SAFE VERSION)
-- Berdasarkan schema existing:
--   pipeline: id, name, slhunter, sales, unit, payment,
--             value, bf, source, status, visitdate, dateadded, note, ts
--   visits:   id, slhunter, sales, date, project, count, note, filed, ts
-- Strategy:
--   - Jangan ubah pipeline/visits (data lama aman)
--   - Tambah user_id ke pipeline saja (nullable, untuk entri baru)
--   - Buat visit_logs (fresh table untuk sistem baru)
--   - Buat users, closings, activities, team_status_history
-- ============================================================

-- ── 1. USERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT NOT NULL,
  pin_hash          TEXT NOT NULL,
  role              TEXT NOT NULL DEFAULT 'hunter'
                      CHECK (role IN ('admin','hunter')),
  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','resigned')),
  monthly_target    BIGINT NOT NULL DEFAULT 0,
  win_or_die_target BIGINT NOT NULL DEFAULT 0,
  visit_target      INTEGER NOT NULL DEFAULT 40,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. VISIT_LOGS (fresh table, bukan visits lama) ──────────
CREATE TABLE IF NOT EXISTS visit_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visit_date  DATE NOT NULL,
  visit_type  TEXT NOT NULL DEFAULT 'konsumen'
                CHECK (visit_type IN ('konsumen','lokasi','assisted','out_of_town','pk','sg_agent')),
  count       INTEGER NOT NULL DEFAULT 1,
  notes       TEXT,
  week_number INTEGER,
  month       INTEGER NOT NULL,
  year        INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visit_logs_user_month ON visit_logs(user_id, month, year);

-- ── 3. PIPELINE — tambah user_id saja (nullable) ────────────
-- Tidak ubah kolom existing. Data lama tetap aman.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pipeline' AND column_name='user_id'
  ) THEN
    ALTER TABLE pipeline ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added user_id to pipeline';
  ELSE
    RAISE NOTICE 'pipeline.user_id already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pipeline' AND column_name='user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_pipeline_user_id ON pipeline(user_id);
  END IF;
  CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline(status);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── 4. CLOSINGS (baru — tidak ada di schema existing) ───────
CREATE TABLE IF NOT EXISTS closings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pipeline_id   TEXT,  -- referensi ke pipeline.id (text)
  konsumen_name TEXT NOT NULL,
  project       TEXT,
  unit          TEXT,
  closing_value BIGINT NOT NULL DEFAULT 0,
  closing_date  DATE NOT NULL,
  month         INTEGER NOT NULL,
  year          INTEGER NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_closings_user_month ON closings(user_id, month, year);

-- ── 5. ACTIVITIES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deadline    DATE,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_progress','completed','overdue')),
  priority    TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high','critical')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. TEAM STATUS HISTORY ───────────────────────────────────
CREATE TABLE IF NOT EXISTS team_status_history (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month      INTEGER NOT NULL,
  year       INTEGER NOT NULL,
  sp_level   INTEGER NOT NULL DEFAULT 0,
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

SELECT 'Migration 001 selesai ✓ — Tabel baru: users, visit_logs, closings, activities, team_status_history' AS status;
