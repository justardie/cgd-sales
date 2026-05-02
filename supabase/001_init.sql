-- ============================================================
-- CGD Sales Dashboard — Migration 001 (SAFE VERSION)
-- Handles pre-existing pipeline/closings tables gracefully
-- Run in Supabase: Dashboard > SQL Editor > New query
-- ============================================================

-- ── 1. USERS (new table) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  pin_hash        TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'hunter'
                    CHECK (role IN ('admin','hunter')),
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','resigned')),
  monthly_target  BIGINT NOT NULL DEFAULT 0,
  win_or_die_target BIGINT NOT NULL DEFAULT 0,
  visit_target    INTEGER NOT NULL DEFAULT 40,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. VISITS (new table) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS visits (
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
CREATE INDEX IF NOT EXISTS idx_visits_user_month ON visits(user_id, month, year);

-- ── 3. PIPELINE — add missing columns to existing table ─────
-- (Table may already exist with old data — we only ADD, never drop)
CREATE TABLE IF NOT EXISTS pipeline (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  konsumen_name  TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'cold',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  -- Add user_id if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pipeline' AND column_name='user_id'
  ) THEN
    ALTER TABLE pipeline ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Add project if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pipeline' AND column_name='project'
  ) THEN
    ALTER TABLE pipeline ADD COLUMN project TEXT;
  END IF;

  -- Add unit if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pipeline' AND column_name='unit'
  ) THEN
    ALTER TABLE pipeline ADD COLUMN unit TEXT;
  END IF;

  -- Add estimated_value if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pipeline' AND column_name='estimated_value'
  ) THEN
    ALTER TABLE pipeline ADD COLUMN estimated_value BIGINT;
  END IF;

  -- Add notes if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pipeline' AND column_name='notes'
  ) THEN
    ALTER TABLE pipeline ADD COLUMN notes TEXT;
  END IF;

  -- Add konsumen_name if not present (for truly new tables only)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pipeline' AND column_name='konsumen_name'
  ) THEN
    ALTER TABLE pipeline ADD COLUMN konsumen_name TEXT;
  END IF;
END $$;

-- Safe index creation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pipeline' AND column_name='user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_pipeline_user ON pipeline(user_id);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pipeline' AND column_name='status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline(status);
  END IF;
END $$;

-- ── 4. CLOSINGS — add missing columns to existing table ─────
CREATE TABLE IF NOT EXISTS closings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  closing_value BIGINT NOT NULL DEFAULT 0,
  closing_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='closings' AND column_name='user_id'
  ) THEN
    ALTER TABLE closings ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='closings' AND column_name='pipeline_id'
  ) THEN
    ALTER TABLE closings ADD COLUMN pipeline_id UUID REFERENCES pipeline(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='closings' AND column_name='konsumen_name'
  ) THEN
    ALTER TABLE closings ADD COLUMN konsumen_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='closings' AND column_name='project'
  ) THEN
    ALTER TABLE closings ADD COLUMN project TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='closings' AND column_name='unit'
  ) THEN
    ALTER TABLE closings ADD COLUMN unit TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='closings' AND column_name='month'
  ) THEN
    ALTER TABLE closings ADD COLUMN month INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='closings' AND column_name='year'
  ) THEN
    ALTER TABLE closings ADD COLUMN year INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='closings' AND column_name='notes'
  ) THEN
    ALTER TABLE closings ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Safe index on closings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='closings' AND column_name='user_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='closings' AND column_name='month'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_closings_user_month ON closings(user_id, month, year);
  END IF;
END $$;

-- ── 5. ACTIVITIES (new table) ───────────────────────────────
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

-- ── 6. TEAM STATUS HISTORY (new table) ──────────────────────
CREATE TABLE IF NOT EXISTS team_status_history (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month     INTEGER NOT NULL,
  year      INTEGER NOT NULL,
  sp_level  INTEGER NOT NULL DEFAULT 0,
  reason    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- ── Done ────────────────────────────────────────────────────
SELECT 'Migration 001 selesai ✓' AS status;
