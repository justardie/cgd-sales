-- ============================================================
-- CGD Sales Dashboard — Supabase Migration 001
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- SAFE: uses IF NOT EXISTS throughout
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'hunter' CHECK (role IN ('admin', 'hunter')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resigned')),
  monthly_target BIGINT NOT NULL DEFAULT 0,
  win_or_die_target BIGINT NOT NULL DEFAULT 0,
  visit_target INTEGER NOT NULL DEFAULT 40,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visits table
CREATE TABLE IF NOT EXISTS visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  visit_type TEXT NOT NULL DEFAULT 'konsumen'
    CHECK (visit_type IN ('konsumen','lokasi','assisted','out_of_town','pk','sg_agent')),
  count INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  week_number INTEGER,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visits_user_month ON visits(user_id, month, year);

-- Pipeline table (safe create — won't override existing)
CREATE TABLE IF NOT EXISTS pipeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  konsumen_name TEXT NOT NULL,
  project TEXT,
  unit TEXT,
  estimated_value BIGINT,
  status TEXT NOT NULL DEFAULT 'cold'
    CHECK (status IN ('cold','warm','hot','negotiation','closed_won','closed_lost')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_user ON pipeline(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline(status);

-- Closings table (safe create)
CREATE TABLE IF NOT EXISTS closings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES pipeline(id) ON DELETE SET NULL,
  konsumen_name TEXT NOT NULL,
  project TEXT,
  unit TEXT,
  closing_value BIGINT NOT NULL DEFAULT 0,
  closing_date DATE NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_closings_user_month ON closings(user_id, month, year);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','overdue')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','critical')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team status history
CREATE TABLE IF NOT EXISTS team_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  sp_level INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- Row Level Security (optional — enable if needed)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED DATA — 11 Sales Hunters + 1 Admin
-- PIN salt: cgd-mascol-2026
-- PINs: Admin=0000, hunters: 1111–9999 (see seed_pins.sql)
-- ============================================================

-- hashPin function (JS): Math.abs(hash).toString(36) with salt
-- Pre-computed hashes are in 002_seed.sql
