CREATE TABLE IF NOT EXISTS unit_special (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('unit_buyback', 'unit_investor', 'stock_sudah_spk')),
  project TEXT NOT NULL DEFAULT '',
  cluster TEXT NOT NULL DEFAULT '',
  unit_no TEXT NOT NULL DEFAULT '',
  lt_lb TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL DEFAULT '',
  sale_price BIGINT NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Sold')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_special_category ON unit_special(category);
CREATE INDEX IF NOT EXISTS idx_unit_special_status ON unit_special(status);

CREATE OR REPLACE FUNCTION set_unit_special_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_unit_special_updated_at ON unit_special;
CREATE TRIGGER trg_unit_special_updated_at
BEFORE UPDATE ON unit_special
FOR EACH ROW
EXECUTE FUNCTION set_unit_special_updated_at();
