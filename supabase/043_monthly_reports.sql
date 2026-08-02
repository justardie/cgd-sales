ALTER TABLE weekly_reports
  ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'weekly'
  CHECK (report_type IN ('weekly', 'monthly'));

ALTER TABLE weekly_reports
  DROP CONSTRAINT IF EXISTS weekly_reports_user_id_period_start_period_end_key;

ALTER TABLE weekly_reports
  ADD CONSTRAINT weekly_reports_user_report_type_period_key
  UNIQUE (user_id, report_type, period_start, period_end);
